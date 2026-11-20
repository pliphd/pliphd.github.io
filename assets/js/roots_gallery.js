// Hide a "Load More" button. The buttons use Bootstrap's .d-block class, which is
// display:block !important, so setting style.display = 'none' does not hide them.
function rootsHideLoadMore(btn) {
  btn.classList.remove('d-block');
  btn.classList.add('d-none');
}

// Wrap in DOMContentLoaded to ensure elements are available
document.addEventListener('DOMContentLoaded', function() {
  // All images data, newest first (photo file names start with YYYYMMDD).
  // Keep this sort identical to the one in collections/_studies/roots.md,
  // otherwise clicking a thumbnail opens a different photo.
  var allImages = [
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260928, Harvard Sleep Health Benefit.jpg", alt: "20260928, Harvard Sleep Health Benefit"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260928, Harvard Sleep Health Benefit 2.jpg", alt: "20260928, Harvard Sleep Health Benefit 2"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260515, Rainbow Adult Day Care Center.jpg", alt: "20260515, Rainbow Adult Day Care Center"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260301, Cambridge.JPG", alt: "20260301, Cambridge"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260228, Lexington High School.JPG", alt: "20260228, Lexington High School"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260214, CSSA.JPG", alt: "20260214, CSSA"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260214, CSSA 2.JPG", alt: "20260214, CSSA 2"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260207, Malden Chinese New Year.jpg", alt: "20260207, Malden Chinese New Year"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260207, Malden Chinese New Year 2.JPG", alt: "20260207, Malden Chinese New Year 2"} ,
  
  
  
  
    {src: "https://pliphd.github.io/assets/images/roots/20260207, Beijing Town Association.JPG", alt: "20260207, Beijing Town Association"} 
  
  
  ];

  // Modal references (unique IDs)
  var modal = document.getElementById('rootsModal');
  if (!modal) return; // not the ROOTS page (this script is loaded on every page)
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
        rootsHideLoadMore(loadMoreBtn);
      }
    });
  }
  if (loadedCount >= allImages.length) {
    if (loadMoreBtn) rootsHideLoadMore(loadMoreBtn);
  }
});

// ROOTS News: "Load More" pagination for the news timeline.
// _sass/_roots.scss hides all but the newest $roots-news-batch items when the
// page loads; each click on "Load More" reveals the next batch of that size.
document.addEventListener('DOMContentLoaded', function() {
  var newsTimeline = document.getElementById('newsTimeline');
  var loadMoreNewsBtn = document.getElementById('loadMoreNewsBtn');
  if (!newsTimeline || !loadMoreNewsBtn) return; // not the ROOTS page

  var newsItems = Array.prototype.slice.call(newsTimeline.querySelectorAll('.timeline-item'));
  function hiddenNewsItems() {
    return newsItems.filter(function(item) {
      return window.getComputedStyle(item).display === 'none';
    });
  }

  // Batch size = however many items the CSS shows on page load
  var batchSize = Math.max(newsItems.length - hiddenNewsItems().length, 1);

  if (hiddenNewsItems().length === 0) {
    rootsHideLoadMore(loadMoreNewsBtn);
    return;
  }

  loadMoreNewsBtn.addEventListener('click', function() {
    hiddenNewsItems().slice(0, batchSize).forEach(function(item) {
      item.classList.add('news-revealed');
    });
    if (hiddenNewsItems().length === 0) {
      rootsHideLoadMore(loadMoreNewsBtn);
    }
  });
});
