// Wrap in DOMContentLoaded to ensure elements are available
document.addEventListener('DOMContentLoaded', function() {
  // All images data
  var allImages = [
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260207, Beijing Town Association.JPG", alt: "20260207, Beijing Town Association"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260207, Malden Chinese New Year 2.JPG", alt: "20260207, Malden Chinese New Year 2"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260207, Malden Chinese New Year.jpg", alt: "20260207, Malden Chinese New Year"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260214, CSSA 2.JPG", alt: "20260214, CSSA 2"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260214, CSSA.JPG", alt: "20260214, CSSA"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260228, Lexington High School.JPG", alt: "20260228, Lexington High School"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260301, Cambridge.JPG", alt: "20260301, Cambridge"} 
  
  
  ];

  // Modal references (unique IDs)
  var modal = document.getElementById('rootsModal');
  var modalImg = document.getElementById("rootsImg01");
  var captionText = document.getElementById("rootsCaption");
  var span = modal.getElementsByClassName("close")[0];
  var prev = modal.querySelector('.prev');
  var next = modal.querySelector('.next');
  var currentIndex;

  // Attach click listeners to initial images
  var initialImages = document.getElementsByClassName('rootsImages');
  for (var i = 0; i < initialImages.length; i++) {
    initialImages[i].addEventListener('click', function() {
      currentIndex = parseInt(this.getAttribute('data-index'));
      modal.style.display = "block";
      modalImg.src = allImages[currentIndex].src;
      captionText.innerHTML = allImages[currentIndex].alt;
    });
  }

  // Close the modal
  span.onclick = function() {
    modal.style.display = "none";
  }

  // Slideshow navigation
  if (prev) {
    prev.onclick = function() {
      currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
      modalImg.src = allImages[currentIndex].src;
      captionText.innerHTML = allImages[currentIndex].alt;
    }
  }

  if (next) {
    next.onclick = function() {
      currentIndex = (currentIndex + 1) % allImages.length;
      modalImg.src = allImages[currentIndex].src;
      captionText.innerHTML = allImages[currentIndex].alt;
    }
  }

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (modal.style.display !== "block") return;
    if (e.key === "ArrowLeft") {
      currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
      modalImg.src = allImages[currentIndex].src;
      captionText.innerHTML = allImages[currentIndex].alt;
    } else if (e.key === "ArrowRight") {
      currentIndex = (currentIndex + 1) % allImages.length;
      modalImg.src = allImages[currentIndex].src;
      captionText.innerHTML = allImages[currentIndex].alt;
    } else if (e.key === "Escape") {
      modal.style.display = "none";
    }
  });

  // Load More functionality
  var loadMoreBtn = document.getElementById('loadMoreBtn');
  var galleryRow = document.getElementById('galleryRow');
  var loadedCount = 6; // Initial loaded
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function() {
      var nextBatch = allImages.slice(loadedCount, loadedCount + 6);
      nextBatch.forEach(function(imgData, idx) {
        var newItem = document.createElement('div');
        newItem.className = 'col-md-4 mb-4 gallery-item';
        newItem.innerHTML = `
          <img src="${imgData.src}" class="img-fluid gallery-thumbnail rootsImages" alt="${imgData.alt}" data-index="${loadedCount + idx}" style="cursor: pointer;">
          <p class="text-center small">${imgData.alt}</p>
        `;
        var newImg = newItem.querySelector('img');
        newImg.addEventListener('click', function() {
          currentIndex = parseInt(this.getAttribute('data-index'));
          modal.style.display = "block";
          modalImg.src = allImages[currentIndex].src;
          captionText.innerHTML = allImages[currentIndex].alt;
        });
        galleryRow.appendChild(newItem);
      });
      loadedCount += nextBatch.length;
      if (loadedCount >= allImages.length) {
        loadMoreBtn.style.display = 'none';
      }
    });
  }
  if (loadedCount >= allImages.length) {
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  }
});