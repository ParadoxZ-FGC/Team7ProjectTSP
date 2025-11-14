function openItemMenu(itemData) {
    document.getElementById("menuItemName").textContent = itemData.name;
    document.getElementById("menuItemDesc").textContent = itemData.desc;
    document.getElementById("menuItemImage").src = itemData.image;

    document.getElementById("itemMenu").classList.add("open");
}

function closeItemMenu() {
    document.getElementById("itemMenu").classList.remove("open");
}