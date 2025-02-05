document.addEventListener("DOMContentLoaded", function () {
  // Supabase 설정 (실제 URL과 KEY로 변경)
  const SUPABASE_URL = "https://lkddstkbnxapncvdeynf.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGRzdGtibnhhcG5jdmRleW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NTkwMDYsImV4cCI6MjA1NDIzNTAwNn0.dFrdDQ-E_23MBe0YQwzNvHWsoShpqJwn7l26CdcJ1xk"; // 실제 키 사용
  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------- 요소 선택 ---------- */
  // 통합 업로드/관리 모달 및 탭 관련
  const uploadBtn = document.getElementById("uploadBtn");
  const mainModal = document.getElementById("mainModal");
  const closeMainModal = document.getElementById("closeMainModal");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const galleryTab = document.getElementById("galleryTab");
  const recTab = document.getElementById("recTab");

  // 갤러리 업로드 관련
  const passwordInput = document.getElementById("password");
  const fileInput = document.getElementById("fileInput");
  const descriptionInput = document.getElementById("description");
  const submitBtn = document.getElementById("submitBtn");

  // 추천 사진 관리 관련
  const recPasswordInput = document.getElementById("recPassword");
  const recFileInput = document.getElementById("recFileInput");
  const recDescriptionInput = document.getElementById("recDescription");
  const submitRecBtn = document.getElementById("submitRecBtn");
  const recList = document.getElementById("recList");

  // 갤러리 관련
  const gallery = document.getElementById("gallery");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  // 이미지 확대(모달) 관련
  const imageModal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const imageDescription = document.getElementById("imageDescription");
  const closeImageModal = document.getElementById("closeImageModal");

  // 갤러리 이미지 확대 모달 내 좌우 화살표
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  // 추천 캐러셀 관련
  const carousel = document.getElementById("carousel");
  const prevCarousel = document.getElementById("prevCarousel");
  const nextCarousel = document.getElementById("nextCarousel");

  let offset = 0;
  const limit = 20;
  let currentIndex = 0; // 갤러리 모달 내 현재 이미지 인덱스

  // 캐러셀 관련 변수
  let carouselIndex = 0;
  let carouselSlides = [];
  let carouselTimer = null;
  const carouselInterval = 5000;

  /* ---------- 모달 및 탭 전환 ---------- */
  // 🌵 버튼 클릭 시 통합 모달 열기 (기본 탭: 갤러리 업로드)
  uploadBtn.addEventListener("click", function () {
    mainModal.style.display = "flex";
    activateTab("galleryTab");
  });

  closeMainModal.addEventListener("click", function () {
    mainModal.style.display = "none";
  });

  // 탭 버튼 클릭 이벤트 처리
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const tabToActivate = this.getAttribute("data-tab");
      activateTab(tabToActivate);
    });
  });

  function activateTab(tabId) {
    if (tabId === "galleryTab") {
      galleryTab.style.display = "block";
      recTab.style.display = "none";
    } else {
      galleryTab.style.display = "none";
      recTab.style.display = "block";
      loadRecommendedList(); // 추천 사진 목록을 최신 상태로 불러옴
    }
    tabButtons.forEach((btn) => {
      if (btn.getAttribute("data-tab") === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  /* ---------- 갤러리 업로드 ---------- */
  submitBtn.addEventListener("click", async function () {
    const password = passwordInput.value;
    const description = descriptionInput.value.trim();
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
    const { error } = await supabaseClient.storage
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
    const { error: insertError } = await supabaseClient
      .from("photos")
      .insert([{ url: urlData.publicUrl, description }]);
    if (insertError) {
      alert(
        "사진 정보를 저장하는 중 오류가 발생했습니다: " +
          (insertError.message || JSON.stringify(insertError))
      );
      return;
    }
    // 갤러리에 새 이미지 추가
    const galleryItem = document.createElement("div");
    galleryItem.className = "gallery-item";
    const img = document.createElement("img");
    img.src = urlData.publicUrl;
    img.setAttribute("data-description", description);
    galleryItem.appendChild(img);
    gallery.insertBefore(galleryItem, gallery.firstChild);
    mainModal.style.display = "none";
  });

  /* ---------- 갤러리 이미지 확대 ---------- */
  gallery.addEventListener("click", function (e) {
    if (e.target.tagName === "IMG") {
      const galleryItems = Array.from(
        gallery.querySelectorAll(".gallery-item img")
      );
      currentIndex = galleryItems.indexOf(e.target);
      openImageModal(currentIndex);
    }
  });

  closeImageModal.addEventListener("click", function () {
    imageModal.style.display = "none";
  });

  imageModal.addEventListener("click", function (e) {
    if (e.target === imageModal) {
      imageModal.style.display = "none";
    }
  });

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
  loadGallery();

  /* ---------- 추천 캐러셀 로드 및 관리 ---------- */
  async function loadRecommended() {
    const { data, error } = await supabaseClient
      .from("recommended")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("추천 사진 로드 오류:", error.message);
      return;
    }
    carousel.innerHTML = "";
    carouselSlides = [];
    data.forEach((item) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.description || "추천 사진";
      // 추천 이미지 클릭 시 확대 (원본 비율 유지: CSS의 object-fit: contain 활용)
      img.addEventListener("click", function () {
        openRecommendedModal(item.url, item.description);
      });
      // 삭제 버튼 (캐러셀 내)
      const delBtn = document.createElement("button");
      delBtn.className = "delete-rec";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", async function (e) {
        e.stopPropagation();
        const pwd = prompt("삭제를 위해 비밀번호를 입력하세요");
        if (pwd !== "firmament") {
          alert("비밀번호가 틀렸습니다!");
          return;
        }
        const { error: delError } = await supabaseClient
          .from("recommended")
          .delete()
          .eq("id", item.id);
        if (delError) {
          alert("삭제 중 오류가 발생했습니다: " + delError.message);
          return;
        }
        alert("삭제되었습니다.");
        loadRecommended();
        loadRecommendedList();
      });
      slide.appendChild(img);
      slide.appendChild(delBtn);
      carousel.appendChild(slide);
      carouselSlides.push(slide);
    });
    carouselIndex = 0;
    updateCarousel();
    startCarouselAuto();
  }

  function updateCarousel() {
    const offsetX = -carouselIndex * 100;
    carousel.style.transform = `translateX(${offsetX}%)`;
  }

  prevCarousel.addEventListener("click", function () {
    carouselIndex =
      (carouselIndex - 1 + carouselSlides.length) % carouselSlides.length;
    updateCarousel();
    resetCarouselAuto();
  });

  nextCarousel.addEventListener("click", function () {
    carouselIndex = (carouselIndex + 1) % carouselSlides.length;
    updateCarousel();
    resetCarouselAuto();
  });

  function startCarouselAuto() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => {
      carouselIndex = (carouselIndex + 1) % carouselSlides.length;
      updateCarousel();
    }, carouselInterval);
  }

  function resetCarouselAuto() {
    clearInterval(carouselTimer);
    startCarouselAuto();
  }

  loadRecommended();

  // 추천 사진 관리 탭: 추천 사진 업로드
  submitRecBtn.addEventListener("click", async function () {
    const password = recPasswordInput.value;
    const description = recDescriptionInput.value.trim();
    if (password !== "firmament") {
      alert("비밀번호가 틀렸습니다!");
      return;
    }
    if (recFileInput.files.length === 0) {
      alert("사진을 선택해주세요!");
      return;
    }
    const file = recFileInput.files[0];
    const filePath = `uploads/${Date.now()}_${file.name}`;
    const { error } = await supabaseClient.storage
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
    const { error: insertError } = await supabaseClient
      .from("recommended")
      .insert([{ url: urlData.publicUrl, description }]);
    if (insertError) {
      alert(
        "추천 사진 정보를 저장하는 중 오류가 발생했습니다: " +
          (insertError.message || JSON.stringify(insertError))
      );
      return;
    }
    alert("추천 사진 업로드 성공!");
    loadRecommendedList();
    loadRecommended();
  });

  // 추천 사진 관리 탭: 추천 사진 목록 로드
  async function loadRecommendedList() {
    const { data, error } = await supabaseClient
      .from("recommended")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("추천 사진 목록 로드 오류:", error.message);
      return;
    }
    recList.innerHTML = "";
    data.forEach((item) => {
      const recItem = document.createElement("div");
      recItem.className = "rec-item";
      const thumb = document.createElement("img");
      thumb.src = item.url;
      // CSS에서 object-fit: contain으로 원본 비율 유지
      const info = document.createElement("span");
      info.textContent = item.description || "";
      const delBtn = document.createElement("button");
      delBtn.className = "rec-delete";
      delBtn.textContent = "삭제";
      delBtn.addEventListener("click", async function () {
        const pwd = prompt("삭제를 위해 비밀번호를 입력하세요");
        if (pwd !== "firmament") {
          alert("비밀번호가 틀렸습니다!");
          return;
        }
        const { error: delError } = await supabaseClient
          .from("recommended")
          .delete()
          .eq("id", item.id);
        if (delError) {
          alert("삭제 중 오류가 발생했습니다: " + delError.message);
          return;
        }
        alert("삭제되었습니다.");
        loadRecommendedList();
        loadRecommended();
      });
      recItem.appendChild(thumb);
      recItem.appendChild(info);
      recItem.appendChild(delBtn);
      recList.appendChild(recItem);
    });
  }

  // 추천 이미지 클릭 시 확대 (추천 이미지 전용)
  function openRecommendedModal(src, description) {
    modalImage.src = src;
    imageDescription.textContent = description || "설명이 없습니다.";
    imageModal.style.display = "flex";
  }
});
