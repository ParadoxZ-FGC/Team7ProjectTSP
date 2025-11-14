package com.example.flexyourodds

import android.Manifest
import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.*
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.*
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors
import com.google.android.gms.location.*

private const val REQ_FOREGROUND = 1001
private const val REQ_BACKGROUND = 1002
private const val REQ_BATTERY_OPTIMIZATION = 1003
private const val REQ_OVERLAY_PERMISSION = 1004

class MainActivity : Activity() {
    private val TAG = "MainActivity"
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make app full screen - this is the key fix
        makeFullScreen()

        // Register boot receiver dynamically
        registerReceiver(deviceBootReceiver, IntentFilter().apply {
            addAction(Intent.ACTION_BOOT_COMPLETED)
            addAction(Intent.ACTION_MY_PACKAGE_REPLACED)
        })

        setupUI()
        checkAndRequestPermissions()

        // Samsung devices need special handling
        if (isSamsungDevice() && !isIgnoringBatteryOptimizations()) {
            Handler(Looper.getMainLooper()).postDelayed({
                showSamsungOptimizationWarning()
            }, 2000)
        }
    }

    private fun makeFullScreen() {
        // Use the correct full screen flags for all versions
        @Suppress("DEPRECATION")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // For Android 11+ (API 30+) - use setDecorFitsSystemWindows only
            window.setDecorFitsSystemWindows(false)
        }

        // For ALL Android versions, use the classic full screen approach
        window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                )

        // Set status bar and navigation bar to transparent
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            makeFullScreen()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(deviceBootReceiver)
        } catch (e: Exception) {
            // Ignore if not registered
        }
    }

    private val deviceBootReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            Log.d(TAG, "Boot received: ${intent.action}")
            when (intent.action) {
                Intent.ACTION_BOOT_COMPLETED,
                Intent.ACTION_MY_PACKAGE_REPLACED -> {
                    if (hasForegroundLocationPermission(context)) {
                        Log.d(TAG, "Auto-starting location service after boot")
                        val serviceIntent = Intent(context, LocationService::class.java)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent)
                        } else {
                            context.startService(serviceIntent)
                        }
                    }
                }
            }
        }
    }

    private fun setupUI() {
        // Generate unique device ID
        val deviceId = generateDeviceId()

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
            )
            webViewClient = WebViewClient()
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true

            // Enable viewport meta tag support for responsive design
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true

            // Load URL with deviceId parameter
            val url = "https://paradoxz-fgc.github.io/Team7ProjectTSP/#deviceId=${URLEncoder.encode(deviceId, "UTF-8")}"
            loadUrl(url)
            Log.d(TAG, "Loading URL: $url")
        }

        setContentView(webView)

        // Apply edge-to-edge insets to handle any remaining system bar overlaps
        applyEdgeToEdgeInsets()
    }

    private fun applyEdgeToEdgeInsets() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            webView.setOnApplyWindowInsetsListener { view, insets ->
                val systemBars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
                insets
            }
        } else {
            @Suppress("DEPRECATION")
            webView.setOnApplyWindowInsetsListener { view, insets ->
                view.setPadding(
                    insets.systemWindowInsetLeft,
                    insets.systemWindowInsetTop,
                    insets.systemWindowInsetRight,
                    insets.systemWindowInsetBottom
                )
                insets
            }
        }
    }

    private fun generateDeviceId(): String {
        val sharedPrefs = getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        var deviceId = sharedPrefs.getString("device_id", null)

        if (deviceId == null) {
            deviceId = "android_" + UUID.randomUUID().toString().substring(0, 8)
            sharedPrefs.edit().putString("device_id", deviceId).apply()
        }

        return deviceId
    }

    private fun checkAndRequestPermissions() {
        if (!hasForegroundLocationPermission(this)) {
            Handler(Looper.getMainLooper()).postDelayed({
                requestForegroundPermissions()
            }, 1000)
        } else {
            // Auto-start service if we have permission
            Handler(Looper.getMainLooper()).postDelayed({
                startLocationService()
            }, 1500)
        }
    }

    private fun startLocationService() {
        if (!hasForegroundLocationPermission(this)) {
            return
        }

        if (LocationService.isRunning) {
            return
        }

        val intent = Intent(this, LocationService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            Log.d(TAG, "Location service started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start service: ${e.message}", e)
        }
    }

    private fun showSamsungOptimizationWarning() {
        if (!isSamsungDevice()) return

        AlertDialog.Builder(this)
            .setTitle("Samsung Device Detected")
            .setMessage("For reliable background tracking, please:\n\n• Disable battery optimization\n• Keep app in 'Never sleeping' list\n• Enable 'Auto-start' for this app")
            .setPositiveButton("Open Settings") { _, _ ->
                openBatteryOptimizationSettings()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun openBatteryOptimizationSettings() {
        try {
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            startActivity(intent)
        } catch (e: Exception) {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.data = Uri.parse("package:$packageName")
            startActivity(intent)
        }
    }

    private fun isSamsungDevice(): Boolean {
        return Build.MANUFACTURER.equals("samsung", ignoreCase = true)
    }

    private fun isIgnoringBatteryOptimizations(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            return powerManager.isIgnoringBatteryOptimizations(packageName)
        }
        return true
    }

    override fun onResume() {
        super.onResume()
        // Re-apply full screen when app resumes
        makeFullScreen()
        // Auto-start service when app comes to foreground
        if (hasForegroundLocationPermission(this)) {
            startLocationService()
        }
    }

    companion object {
        fun hasForegroundLocationPermission(context: Context): Boolean {
            val fine = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val coarse = context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            return fine || coarse
        }

        fun hasBackgroundLocationPermission(context: Context): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            } else true
        }
    }

    private fun requestForegroundPermissions() {
        val permissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        requestPermissions(permissions, REQ_FOREGROUND)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        when (requestCode) {
            REQ_FOREGROUND -> {
                val granted = grantResults.isNotEmpty() && grantResults.any { it == PackageManager.PERMISSION_GRANTED }
                if (granted) {
                    startLocationService()
                    // Auto-request background permission
                    Handler(Looper.getMainLooper()).postDelayed({
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            requestBackgroundPermission()
                        }
                    }, 1000)
                }
            }
        }
    }

    private fun requestBackgroundPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            AlertDialog.Builder(this)
                .setTitle("Background Location")
                .setMessage("This allows tracking when app is in background. Required for continuous fitness tracking.")
                .setPositiveButton("Allow") { _, _ ->
                    requestPermissions(
                        arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                        REQ_BACKGROUND
                    )
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }
}

// LocationService class - must be in the same file
class LocationService : Service() {
    companion object {
        @JvmField var isRunning = false
        private const val WAKE_LOCK_TAG = "fitness:LocationService"
    }

    private val TAG = "LocationService"
    private val CHANNEL_ID = "fitness_tracking_channel"
    private val NOTIF_ID = 1801

    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var wakeLock: PowerManager.WakeLock
    private val executor = Executors.newSingleThreadExecutor()
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private val PENDING_FILE = "pending_posts.txt"
    private val LOG_FILE = "location_post_log.txt"

    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            for (loc in result.locations) {
                Log.d(TAG, "Location: ${loc.latitude}, ${loc.longitude} acc=${loc.accuracy}")
                val timestamp = dateFormat.format(Date(loc.time))

                // Get device ID from shared preferences
                val sharedPrefs = getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
                val deviceId = sharedPrefs.getString("device_id", "unknown_device")

                val params = mapOf(
                    "latitude" to loc.latitude.toString(),
                    "longitude" to loc.longitude.toString(),
                    "timestamp" to timestamp,
                    "accuracy" to loc.accuracy.toString(),
                    "speed" to loc.speed.toString(),
                    "bearing" to loc.bearing.toString(),
                    "deviceId" to (deviceId ?: "unknown_device"),
                    "appName" to "FlexYourOdds"
                )
                sendFormPost(params)
            }
        }

        override fun onLocationAvailability(availability: LocationAvailability) {
            Log.d(TAG, "Location available: ${availability.isLocationAvailable}")
            logLocal("Location available: ${availability.isLocationAvailable}")
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)

        // Acquire wake lock to prevent CPU from sleeping
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "$WAKE_LOCK_TAG:${System.currentTimeMillis()}"
        )
        wakeLock.setReferenceCounted(false)

        createNotificationChannel()
        isRunning = true
        logLocal("Service created - wake lock acquired")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service onStartCommand")

        // Acquire wake lock when service starts
        if (!wakeLock.isHeld) {
            wakeLock.acquire(60 * 60 * 1000L) // 1 hour timeout
            Log.d(TAG, "Wake lock acquired")
        }

        // Start foreground quickly to avoid system stopping us
        startForeground(NOTIF_ID, buildNotification("Tracking location in background"))
        requestLocationUpdatesIfAllowed()
        executor.execute { drainPendingQueue() }

        return START_REDELIVER_INTENT
    }

    private fun requestLocationUpdatesIfAllowed() {
        try {
            val fineGranted = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val coarseGranted = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

            if (!fineGranted && !coarseGranted) {
                Log.e(TAG, "No location permission")
                logLocal("No location permission - stopping")
                stopSelf()
                return
            }

            // Improved location request for better background performance
            val request = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                LocationRequest.Builder(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    30_000L
                ).apply {
                    setMinUpdateIntervalMillis(15_000L)
                    setWaitForAccurateLocation(true)
                    setMinUpdateDistanceMeters(5f)
                }.build()
            } else {
                @Suppress("DEPRECATION")
                LocationRequest.create().apply {
                    interval = 30_000L
                    fastestInterval = 15_000L
                    smallestDisplacement = 5f
                    priority = LocationRequest.PRIORITY_HIGH_ACCURACY
                }
            }

            fusedClient.requestLocationUpdates(
                request,
                callback,
                Looper.getMainLooper()
            ).addOnSuccessListener {
                Log.d(TAG, "Location updates active")
                logLocal("Location tracking ACTIVE")
                updateNotification("Tracking active - background enabled")
            }.addOnFailureListener { e ->
                Log.e(TAG, "Location updates failed: ${e.message}", e)
                logLocal("Location updates FAILED: ${e.message}")
                updateNotification("Tracking issue - check permissions")
            }

        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException: ${e.message}", e)
            logLocal("SecurityException: ${e.message}")
            stopSelf()
        } catch (e: Exception) {
            Log.e(TAG, "Exception: ${e.message}", e)
            logLocal("Exception: ${e.message}")
        }
    }

    private fun updateNotification(text: String) {
        val notification = buildNotification(text)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIF_ID, notification)
    }

    private fun sendFormPost(params: Map<String, String>) {
        executor.execute {
            val body = buildFormBody(params)
            val now = System.currentTimeMillis()
            val shortcut = "lat=${params["latitude"]} lon=${params["longitude"]}"
            logLocal("Sending: $shortcut")

            if (!isNetworkAvailable()) {
                logLocal("Network unavailable - queuing")
                appendPending(body)
                return@execute
            }

            var conn: HttpURLConnection? = null
            try {
                val url = URL("https://caedenkidd.com/projects/fitness-project/record-location.php")
                conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    doInput = true
                    useCaches = false
                    connectTimeout = 15_000
                    readTimeout = 15_000
                    setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                    setRequestProperty("Accept", "text/plain, application/json, */*")
                    setRequestProperty("User-Agent", "FlexYourOddsApp/1.0")
                }

                conn.outputStream.use { out ->
                    out.write(body.toByteArray(Charsets.UTF_8))
                    out.flush()
                }

                val code = conn.responseCode
                val msg = conn.responseMessage
                logLocal("POST: $code $msg")

                if (code in 200..299) {
                    val resp = conn.inputStream.bufferedReader().use { it.readText() }
                    logLocal("Success: $resp")
                    drainPendingQueue()
                } else {
                    val err = conn.errorStream?.bufferedReader()?.use { it.readText() }
                    logLocal("Error $code: $err")
                    appendPending(body)
                }
            } catch (e: Exception) {
                logLocal("Network error: ${e.message}")
                appendPending(body)
            } finally {
                conn?.disconnect()
            }
        }
    }

    private fun appendPending(body: String) {
        try {
            openFileOutput(PENDING_FILE, Context.MODE_APPEND).use { fos ->
                fos.write((body + "\n").toByteArray(Charsets.UTF_8))
            }
        } catch (e: Exception) {
            logLocal("Failed to append pending: ${e.message}")
        }
    }

    private fun drainPendingQueue() {
        try {
            val f = File(filesDir, PENDING_FILE)
            if (!f.exists()) {
                return
            }

            val lines = f.readLines().filter { it.isNotBlank() }
            if (lines.isEmpty()) {
                f.delete()
                return
            }

            logLocal("Draining ${lines.size} pending locations")
            val remaining = ArrayList<String>()

            for (line in lines) {
                if (!isNetworkAvailable()) {
                    remaining.add(line)
                    continue
                }

                var conn: HttpURLConnection? = null
                try {
                    val url = URL("https://caedenkidd.com/record-location.php")
                    conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        doOutput = true
                        doInput = true
                        useCaches = false
                        connectTimeout = 15_000
                        readTimeout = 15_000
                        setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                        setRequestProperty("User-Agent", "FlexYourOddsApp/1.0")
                    }

                    conn.outputStream.use { out ->
                        out.write(line.toByteArray(Charsets.UTF_8))
                        out.flush()
                    }

                    val code = conn.responseCode
                    if (code !in 200..299) {
                        remaining.add(line)
                    }
                } catch (e: Exception) {
                    remaining.add(line)
                } finally {
                    conn?.disconnect()
                }
            }

            if (remaining.isNotEmpty()) {
                openFileOutput(PENDING_FILE, Context.MODE_PRIVATE).use { fos ->
                    for (r in remaining) fos.write((r + "\n").toByteArray(Charsets.UTF_8))
                }
                logLocal("Pending: ${remaining.size} remaining")
            } else {
                File(filesDir, PENDING_FILE).delete()
                logLocal("All pending locations sent")
            }
        } catch (e: Exception) {
            logLocal("Drain error: ${e.message}")
        }
    }

    private fun buildFormBody(params: Map<String, String>): String {
        val sb = StringBuilder()
        var first = true
        for ((k, v) in params) {
            if (!first) sb.append('&') else first = false
            sb.append(URLEncoder.encode(k, "UTF-8"))
            sb.append('=')
            sb.append(URLEncoder.encode(v ?: "", "UTF-8"))
        }
        return sb.toString()
    }

    private fun isNetworkAvailable(): Boolean {
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val active = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(active) ?: return false
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        } catch (e: Exception) {
            false
        }
    }

    private fun logLocal(line: String) {
        try {
            val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
            openFileOutput(LOG_FILE, Context.MODE_APPEND).use { fos ->
                fos.write(("[$timestamp] $line\n").toByteArray(Charsets.UTF_8))
            }
        } catch (e: Exception) {
            // Ignore log write errors
        }
        Log.d(TAG, "LOCALLOG: $line")
    }

    private fun buildNotification(text: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pending = PendingIntent.getActivity(this, 0, openIntent, pendingFlags)

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("Fitness Tracker Running")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentIntent(pending)
            .setOngoing(true)
            .setPriority(Notification.PRIORITY_HIGH)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val ch = NotificationChannel(
                CHANNEL_ID,
                "Fitness Tracking Service",
                NotificationManager.IMPORTANCE_HIGH
            )
            ch.description = "Shows when fitness location tracking is active"
            ch.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            ch.setShowBadge(false)
            nm.createNotificationChannel(ch)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            fusedClient.removeLocationUpdates(callback)
            Log.d(TAG, "Location updates removed")
        } catch (e: Exception) {
            Log.e(TAG, "Error removing updates: ${e.message}")
        }

        // Release wake lock
        if (wakeLock.isHeld) {
            wakeLock.release()
            Log.d(TAG, "Wake lock released")
        }

        executor.shutdown()
        isRunning = false
        logLocal("Service destroyed")
    }

    override fun onBind(intent: Intent?) = null
}
