// js/landing.js
// FAQ accordion ในหน้า landing — แยกออกมาเป็นไฟล์เพื่อให้สอดคล้องกับ CSP
// (CSP ที่ตั้งไว้ไม่อนุญาต inline script)

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const answer = button.nextElementSibling;
    const icon = button.querySelector("span:last-child");
    if (answer.style.maxHeight) {
      answer.style.maxHeight = null;
      icon.style.transform = "rotate(0deg)";
    } else {
      answer.style.maxHeight = answer.scrollHeight + "px";
      icon.style.transform = "rotate(90deg)";
    }
  });
});