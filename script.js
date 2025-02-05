document.addEventListener("DOMContentLoaded", function () {
  // Supabase 설정
  const SUPABASE_URL = "https://lkddstkbnxapncvdeynf.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGRzdGtibnhhcG5jdmRleW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NTkwMDYsImV4cCI6MjA1NDIzNTAwNn0.dFrdDQ-E_23MBe0YQwzNvHWsoShpqJwn7l26CdcJ1xk";

  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  const uploadBtn = document.getElementById("uploadBtn");
  const uploadModal = document.getElementById("uploadModal");
  const closeModal = document.querySelector("#uploadModal .close");
  const submitBtn = document.getElementById("submitBtn");
  const gallery = document.getElementById("gallery");
  const imageModal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const closeImageModal = document.getElementById("closeImageModal");
  const imageDescription = document.getElementById("imageDescription");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  // 좌우 고정 화살표 버튼
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  let offset = 0;
  const limit = 20;
  let currentIndex = 0; // 모달에서 현재 선택된 이미지 인덱스

  uploadBtn.addEventListener("click", function () {
    uploadModal.style.display = "flex";
  });

  closeModal.addEventListener("click", function () {
    uploadModal.style.display = "none";
  });

  submitBtn.addEventListener("click", async function () {
    const password = document.getElementById("password").value;
    const fileInput = document.getElementById("fileInput");
    const description = document.getElementById("description").value.trim();

    if (password !== "firmament") {
      alert("비밀번호가 틀렸습니다!");
      return;
    }

    if (fileInput.files.length === 0) {
      alert("사진을 선택해주세요!");
      return;
    }

    const file = fileInput.files[0];
    const filePath = `uploads/${Date.now()}_${file.name}`;

    const { data, error } = await supabaseClient.storage
      .from("images")
      .upload(filePath, file);

    if (error) {
      alert("업로드 중 오류가 발생했습니다: " + error.message);
      return;
    }

    const { data: urlData, error: urlError } = supabaseClient.storage
      .from("images")
      .getPublicUrl(filePath);

    if (urlError) {
      alert(
        "이미지 URL을 가져오는 중 오류가 발생했습니다: " + urlError.message
      );
      return;
    }

    // Supabase 테이블에 사진 URL과 설명 저장
    const { error: insertError } = await supabaseClient
      .from("photos")
      .insert([{ url: urlData.publicUrl, description }]);

    if (insertError) {
      alert(
        "사진 정보를 저장하는 중 오류가 발생했습니다: " + insertError.message
      );
      return;
    }

    // 이미지 엘리먼트를 생성하고 gallery-item 컨테이너에 넣기
    const galleryItem = document.createElement("div");
    galleryItem.className = "gallery-item";
    const img = document.createElement("img");
    img.src = urlData.publicUrl;
    img.setAttribute("data-description", description);
    galleryItem.appendChild(img);
    gallery.insertBefore(galleryItem, gallery.firstChild);

    uploadModal.style.display = "none";
  });

  // 갤러리에서 이미지 클릭 시 모달 열기 및 현재 인덱스 업데이트
  gallery.addEventListener("click", function (e) {
    // 실제 이미지 클릭 시 (wrapper 안의 img)
    if (e.target.tagName === "IMG") {
      const galleryItems = Array.from(
        gallery.querySelectorAll(".gallery-item img")
      );
      currentIndex = galleryItems.indexOf(e.target);
      openImageModal(currentIndex);
    }
  });

  // 모달 닫기
  closeImageModal.addEventListener("click", function () {
    imageModal.style.display = "none";
  });

  imageModal.addEventListener("click", function (e) {
    if (e.target === imageModal) {
      imageModal.style.display = "none";
    }
  });

  // 좌우 화살표 클릭 이벤트
  prevBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    const galleryItems = Array.from(
      gallery.querySelectorAll(".gallery-item img")
    );
    currentIndex =
      (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    openImageModal(currentIndex, true);
  });

  nextBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    const galleryItems = Array.from(
      gallery.querySelectorAll(".gallery-item img")
    );
    currentIndex = (currentIndex + 1) % galleryItems.length;
    openImageModal(currentIndex, true);
  });

  // 모달에 이미지를 부드럽게 전환하며 보여주는 함수
  function openImageModal(index, animate = false) {
    const galleryItems = Array.from(
      gallery.querySelectorAll(".gallery-item img")
    );
    const targetImg = galleryItems[index];
    if (!targetImg) return;

    if (animate) {
      modalImage.style.opacity = 0;
      setTimeout(() => {
        modalImage.src = targetImg.src;
        imageDescription.textContent =
          targetImg.getAttribute("data-description") || "설명이 없습니다.";
      }, 300);
      setTimeout(() => {
        modalImage.style.opacity = 1;
      }, 350);
    } else {
      modalImage.src = targetImg.src;
      imageDescription.textContent =
        targetImg.getAttribute("data-description") || "설명이 없습니다.";
    }

    imageModal.style.display = "flex";
  }

  async function loadGallery() {
    const { data, error } = await supabaseClient
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("갤러리 로드 오류:", error.message);
      return;
    }

    data.forEach((item) => {
      const galleryItem = document.createElement("div");
      galleryItem.className = "gallery-item";
      const img = document.createElement("img");
      img.src = item.url;
      img.setAttribute(
        "data-description",
        item.description || "설명이 없습니다."
      );
      galleryItem.appendChild(img);
      gallery.appendChild(galleryItem);
    });

    offset += limit;
    loadMoreBtn.style.display = data.length < limit ? "none" : "block";
  }

  loadMoreBtn.addEventListener("click", loadGallery);

  loadGallery(); // 최초 20개 사진 로드
});
