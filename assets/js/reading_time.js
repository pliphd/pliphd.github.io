const post = document.getElementById("post");
const readingTimeCount = document.querySelector(".reading-time count");
const readingTimeTimer = document.querySelector(".reading-time timer");
const avgWordsPerMin = 250;

setReadingTime();

function setReadingTime() {
  let count = getWordCount();
  let time = Math.ceil(count / avgWordsPerMin);

  readingTimeTimer.innerText = "  " + time + " min read (at " + avgWordsPerMin + " words per minute)";
  readingTimeCount.innerText = "  " + count + " words";
}

function getWordCount() {
  return post.innerText.match(/\w+/g).length;
}
