package com.example.flexyourodds

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationCompat
import com.example.flexyourodds.ui.theme.FlexYourOddsTheme
import com.google.android.gms.location.*
import com.google.android.gms.location.FusedLocationProviderClient

/**
 * MainActivity – displays a fullscreen WebView and starts a foreground location service.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FlexYourOddsTheme {
                FullscreenWebView(url = "https://caedenkidd.com/projects/fitness")
                RequestLocationPermissionsAndStartService()
            }
        }
    }
}

/**
 * Request runtime location permissions and start the foreground service.
 */
@Composable
fun RequestLocationPermissionsAndStartService() {
    val context = LocalContext.current
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions.values.all { it }
        if (granted) {
            val intent = Intent(context, LocationService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            )
        )
    }
}

/**
 * WebView Composable – renders the given URL fullscreen.
 */
@Composable
fun FullscreenWebView(url: String) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                webViewClient = WebViewClient()
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    loadsImagesAutomatically = true
                    mixedContentMode =
                        android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                }
                loadUrl(url)
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}

/**
 * Foreground Service – tracks location updates suitable for fitness tracking.
 * Replace the placeholder "handleLocation" with your own logic.
 */
class LocationService : Service() {

    private lateinit var fusedClient: FusedLocationProviderClient
    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val loc = result.lastLocation ?: return
            // Placeholder: handle or queue location data securely
            // e.g., store locally or upload using your HTTPS API client.
            android.util.Log.d("LocationService", "Lat=${loc.latitude}, Lng=${loc.longitude}")
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(1, createNotification())
        startTracking()
        return START_STICKY
    }

    private fun startTracking() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
            .setMinUpdateDistanceMeters(10f)
            .build()

        if (ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
        }
    }

    private fun createNotification(): Notification {
        val channelId = "fitness_tracking"
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Fitness Tracking",
                NotificationManager.IMPORTANCE_LOW
            )
            manager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Tracking your activity")
            .setContentText("Location tracking is active")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedClient.removeLocationUpdates(callback)
    }

    override fun onBind(intent: Intent?) = null
}
