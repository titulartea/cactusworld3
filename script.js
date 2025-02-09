document.addEventListener("DOMContentLoaded", function () {
  // Supabase 설정 (실제 URL과 KEY 사용)
  const SUPABASE_URL = "https://lkddstkbnxapncvdeynf.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGRzdGtibnhhcG5jdmRleW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NTkwMDYsImV4cCI6MjA1NDIzNTAwNn0.dFrdDQ-E_23MBe0YQwzNvHWsoShpqJwn7l26CdcJ1xk";
  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------- 요소 선택 ---------- */
  const uploadBtn = document.getElementById("uploadBtn");
  const mainModal = document.getElementById("mainModal");
  const closeMainModal = document.getElementById("closeMainModal");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const galleryTab = document.getElementById("galleryTab");
  const recTab = document.getElementById("recTab");

  const passwordInput = document.getElementById("password");
  const fileInput = document.getElementById("fileInput");
  const descriptionInput = document.getElementById("description");
  const submitBtn = document.getElementById("submitBtn");

  const recPasswordInput = document.getElementById("recPassword");
  const recFileInput = document.getElementById("recFileInput");
  const recDescriptionInput = document.getElementById("recDescription");
  const submitRecBtn = document.getElementById("submitRecBtn");
  const recList = document.getElementById("recList");

  const gallery = document.getElementById("gallery");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  loadMoreBtn.innerHTML = "﹀";
  loadMoreBtn.style.display = "none";

  const imageModal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const imageDescription = document.getElementById("imageDescription");
  const closeImageBtn = document.getElementById("closeImageBtn");

  const openOptionBtn = document.getElementById("openOptionBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const carousel = document.getElementById("carousel");
  const prevCarousel = document.getElementById("prevCarousel");
  const nextCarousel = document.getElementById("nextCarousel");

  // 사진 옵션 모달 관련 요소
  const editDeleteModal = document.getElementById("editDeleteModal");

  const editPhotoBtnOption = document.getElementById("editPhotoBtnOption");
  const deletePhotoBtnOption = document.getElementById("deletePhotoBtnOption");

  // 수정 시 파일 교체를 위한 숨김 파일 입력
  const editFileInput = document.getElementById("editFileInput");

  let offset = 0;
  const limit = 32;
  let currentIndex = 0; // 갤러리 모달 내 현재 이미지 인덱스
  let currentPhotoRecord = null; // 현재 모달에서 열려있는 사진 정보 객체

  // 캐러셀 관련 변수
  let carouselIndex = 0;
  let carouselSlides = [];
  let carouselTimer = null;
  const carouselInterval = 2500;

  /* ---------- 모달 및 탭 전환 ---------- */
  uploadBtn.addEventListener("click", function () {
    mainModal.style.display = "flex";
    activateTab("galleryTab");
  });

  closeMainModal.addEventListener("click", function () {
    mainModal.style.display = "none";
  });

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
      loadRecommendedList();
    }
    tabButtons.forEach((btn) => {
      btn.getAttribute("data-tab") === tabId
        ? btn.classList.add("active")
        : btn.classList.remove("active");
    });
  }

  /* ---------- 갤러리 업로드 (개선된 코드) ---------- */
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
    // 이미지 스토리지 업로드
    const { error } = await supabaseClient.storage
      .from("images")
      .upload(filePath, file);
    if (error) {
      alert("업로드 중 오류가 발생했습니다: " + error.message);
      return;
    }
    // 공개 URL 가져오기
    const { data: urlData, error: urlError } = supabaseClient.storage
      .from("images")
      .getPublicUrl(filePath);
    if (urlError) {
      alert(
        "이미지 URL을 가져오는 중 오류가 발생했습니다: " + urlError.message
      );
      return;
    }
    // DB에 사진 정보를 insert (실제 DB의 id를 반환받도록 함)
    const { data: insertedData, error: insertError } = await supabaseClient
      .from("photos")
      .insert([{ url: urlData.publicUrl, description }], {
        returning: "representation",
      });
    if (insertError) {
      alert(
        "사진 정보를 저장하는 중 오류가 발생했습니다: " +
          (insertError.message || JSON.stringify(insertError))
      );
      return;
    }
    const photoRecord = insertedData[0];
    // 갤러리에 새 이미지 추가 (실제 DB의 id 사용)
    const galleryItem = document.createElement("div");
    galleryItem.className = "gallery-item";
    const img = document.createElement("img");
    img.src = urlData.publicUrl;
    img.setAttribute("data-description", description);
    img.setAttribute("data-id", photoRecord.id);
    galleryItem.appendChild(img);
    gallery.insertBefore(galleryItem, gallery.firstChild);
    mainModal.style.display = "none";
  });

  /* ---------- 갤러리 로드 ---------- */
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
      img.setAttribute("data-id", item.id);
      galleryItem.appendChild(img);
      gallery.appendChild(galleryItem);
    });
    offset += limit;
    loadMoreBtn.style.display = data.length < limit ? "none" : "block";
  }

  loadMoreBtn.addEventListener("click", loadGallery);
  loadGallery();

  /* ---------- 갤러리 이미지 확대 및 현재 사진 정보 저장 ---------- */
  gallery.addEventListener("click", function (e) {
    if (e.target.tagName === "IMG") {
      const galleryItems = Array.from(
        gallery.querySelectorAll(".gallery-item img")
      );
      currentIndex = galleryItems.indexOf(e.target);
      openImageModal(currentIndex);
    }
  });

  function openImageModal(index, animate = false) {
    const galleryItems = Array.from(
      gallery.querySelectorAll(".gallery-item img")
    );
    const targetImg = galleryItems[index];
    if (!targetImg) return;
    // 현재 사진의 id, url, 설명, 그리고 해당 DOM 요소(갤러리 아이템) 저장
    currentPhotoRecord = {
      id: targetImg.getAttribute("data-id"),
      url: targetImg.src,
      description:
        targetImg.getAttribute("data-description") || "설명이 없습니다.",
      element: targetImg.parentElement,
    };
    if (animate) {
      modalImage.style.opacity = 0;
      setTimeout(() => {
        modalImage.src = targetImg.src;
        imageDescription.textContent = currentPhotoRecord.description;
      }, 300);
      setTimeout(() => {
        modalImage.style.opacity = 1;
      }, 350);
    } else {
      modalImage.src = targetImg.src;
      imageDescription.textContent = currentPhotoRecord.description;
    }
    imageModal.style.display = "flex";
  }

  // 모달 닫기 버튼
  closeImageBtn.addEventListener("click", function () {
    imageModal.style.display = "none";
  });

  // 모달 바깥 영역 클릭 시 닫기
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

  // nextBtn 클릭 시, 마지막 사진이면 추가 사진 로드 후 다음 사진으로 이동
  nextBtn.addEventListener("click", async function (e) {
    e.stopPropagation();
    let galleryItems = Array.from(
      gallery.querySelectorAll(".gallery-item img")
    );
    if (currentIndex === galleryItems.length - 1) {
      await loadGallery();
      galleryItems = Array.from(gallery.querySelectorAll(".gallery-item img"));
      if (currentIndex < galleryItems.length - 1) {
        currentIndex++;
      } else {
        alert("더 이상 사진이 없습니다.");
        return;
      }
    } else {
      currentIndex++;
    }
    openImageModal(currentIndex, true);
  });

  /* ---------- 옵션 버튼을 통한 사진 옵션 모달 열기 ---------- */
  openOptionBtn.addEventListener("click", function () {
    editDeleteModal.style.display = "flex";
  });

  /* ---------- 수정 기능 (옵션 모달 내 수정 버튼) ---------- */
  editPhotoBtnOption.addEventListener("click", function () {
    const pwd = prompt("수정을 위해 비밀번호를 입력하세요");
    if (pwd !== "firmament") {
      alert("비밀번호가 틀렸습니다!");
      return;
    }
    editDeleteModal.style.display = "none";
    const newDescription = prompt(
      "새로운 사진 소개를 입력하세요",
      currentPhotoRecord.description
    );
    if (newDescription === null) return;
    showEditOptions(newDescription);
  });

  function showEditOptions(newDescription) {
    // 기존 옵션 UI 제거
    const existingOptions = document.getElementById("editOptions");
    if (existingOptions) existingOptions.remove();

    const optionContainer = document.createElement("div");
    optionContainer.id = "editOptions";
    optionContainer.style.position = "absolute";
    optionContainer.style.top = "10px";
    optionContainer.style.right = "10px";
    optionContainer.style.background = "rgba(0,0,0,0.7)";
    optionContainer.style.padding = "10px";
    optionContainer.style.borderRadius = "8px";
    optionContainer.style.zIndex = "30";
    optionContainer.innerHTML = `
      <button id="changeFileBtn" class="modal-btn edit-btn" style="margin-right:10px;">사진 파일 변경</button>
      <button id="updateDescBtn" class="modal-btn edit-btn">소개만 수정</button>
    `;
    imageModal.appendChild(optionContainer);

    // 사진 파일 변경 처리
    document
      .getElementById("changeFileBtn")
      .addEventListener("click", function () {
        editFileInput.click();
        editFileInput.onchange = async function (event) {
          if (event.target.files.length > 0) {
            const file = event.target.files[0];
            const filePath = `uploads/${Date.now()}_${file.name}`;
            // 기존 파일 URL 저장 (이전 파일 삭제용)
            const oldUrl = currentPhotoRecord.url;
            // 새 파일 업로드
            const { error } = await supabaseClient.storage
              .from("images")
              .upload(filePath, file);
            if (error) {
              alert("업로드 중 오류: " + error.message);
              optionContainer.remove();
              return;
            }
            const { data: urlData, error: urlError } = supabaseClient.storage
              .from("images")
              .getPublicUrl(filePath);
            if (urlError) {
              alert("이미지 URL 가져오기 오류: " + urlError.message);
              optionContainer.remove();
              return;
            }
            // DB 업데이트: 새 URL과 수정된 소개 적용
            const { error: updateError } = await supabaseClient
              .from("photos")
              .update({ url: urlData.publicUrl, description: newDescription })
              .eq("id", currentPhotoRecord.id);
            if (updateError) {
              alert("수정 오류: " + updateError.message);
              optionContainer.remove();
              return;
            }
            // 기존 스토리지 파일 삭제 (중복 파일 방지)
            const oldFilePath = getFilePathFromUrl(oldUrl);
            if (oldFilePath) {
              await supabaseClient.storage.from("images").remove([oldFilePath]);
            }
            alert("사진이 수정되었습니다.");
            // UI 업데이트
            currentPhotoRecord.element.querySelector("img").src =
              urlData.publicUrl;
            currentPhotoRecord.element
              .querySelector("img")
              .setAttribute("data-description", newDescription);
            modalImage.src = urlData.publicUrl;
            imageDescription.textContent = newDescription;
            currentPhotoRecord.url = urlData.publicUrl;
            optionContainer.remove();
          }
        };
      });

    // 단순 소개 수정 처리
    document
      .getElementById("updateDescBtn")
      .addEventListener("click", async function () {
        const { error: updateError } = await supabaseClient
          .from("photos")
          .update({ description: newDescription })
          .eq("id", currentPhotoRecord.id);
        if (updateError) {
          alert("수정 오류: " + updateError.message);
          optionContainer.remove();
          return;
        }
        alert("사진 소개가 수정되었습니다.");
        currentPhotoRecord.element
          .querySelector("img")
          .setAttribute("data-description", newDescription);
        imageDescription.textContent = newDescription;
        optionContainer.remove();
      });
  }

  /* ---------- 삭제 기능 (옵션 모달 내 삭제 버튼) ---------- */
  deletePhotoBtnOption.addEventListener("click", async function () {
    const pwd = prompt("삭제를 위해 비밀번호를 입력하세요");
    if (pwd !== "firmament") {
      alert("비밀번호가 틀렸습니다!");
      return;
    }
    editDeleteModal.style.display = "none";
    // DB에서 사진 레코드 삭제
    const { error } = await supabaseClient
      .from("photos")
      .delete()
      .eq("id", currentPhotoRecord.id);
    if (error) {
      alert("삭제 오류: " + error.message);
      return;
    }
    // 스토리지에서 파일 삭제
    const filePath = getFilePathFromUrl(currentPhotoRecord.url);
    if (filePath) {
      await supabaseClient.storage.from("images").remove([filePath]);
    }
    alert("사진이 삭제되었습니다.");
    currentPhotoRecord.element.remove();
    imageModal.style.display = "none";
  });

  // 파일 경로 추출 함수 (스토리지 삭제용)
  function getFilePathFromUrl(url) {
    // Supabase Storage URL 형식에 맞게 조정 (예: "/uploads/..."를 추출)
    const marker = "/uploads/";
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.substring(index + 1); // 앞의 '/'를 제거하여 경로 반환
  }

  /* ---------- 갤러리 캐러셀 로드 및 관리 ---------- */
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
      img.addEventListener("click", function () {
        openRecommendedModal(item.url, item.description);
      });
      const delBtn = document.createElement("button");
      delBtn.className = "delete-rec";
      delBtn.textContent = "×";
      delBtn.style.backgroundColor = "#f44336";
      delBtn.style.color = "white";
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
        // 스토리지에서 추천 사진 파일 삭제
        const filePath = getFilePathFromUrl(item.url);
        if (filePath) {
          await supabaseClient.storage.from("images").remove([filePath]);
        }
        alert("삭제되었습니다.");
        loadRecommendedList();
        loadRecommended();
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
    const currentSlideImg = carouselSlides[carouselIndex].querySelector("img");
    if (currentSlideImg) {
      document.getElementById(
        "carousel-bg"
      ).style.backgroundImage = `url(${currentSlideImg.src})`;
    }
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

  let touchStartX = 0;
  let touchEndX = 0;
  carousel.addEventListener("touchstart", function (e) {
    touchStartX = e.touches[0].clientX;
  });
  carousel.addEventListener("touchend", function (e) {
    touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      carouselIndex =
        diff > 0
          ? (carouselIndex + 1) % carouselSlides.length
          : (carouselIndex - 1 + carouselSlides.length) % carouselSlides.length;
      updateCarousel();
      resetCarouselAuto();
    }
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

  /* ---------- 추천 사진 관리 탭 ---------- */
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
      const info = document.createElement("span");
      info.textContent = item.description || "";
      const delBtn = document.createElement("button");
      delBtn.className = "rec-delete";
      delBtn.textContent = "삭제";
      delBtn.style.backgroundColor = "#f44336";
      delBtn.style.color = "white";
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
        // 스토리지에서 파일 삭제
        const filePath = getFilePathFromUrl(item.url);
        if (filePath) {
          await supabaseClient.storage.from("images").remove([filePath]);
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

  function openRecommendedModal(src, description) {
    modalImage.src = src;
    imageDescription.textContent = description || "설명이 없습니다.";
    imageModal.style.display = "flex";
  }

  /* ---------- 확대된 사진 모달에서 스와이프로 사진 이동 ---------- */
  let modalTouchStartX = 0;
  let modalTouchEndX = 0;
  imageModal.addEventListener("touchstart", function (e) {
    modalTouchStartX = e.touches[0].clientX;
  });
  imageModal.addEventListener("touchend", function (e) {
    modalTouchEndX = e.changedTouches[0].clientX;
    const diff = modalTouchStartX - modalTouchEndX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextBtn.click() : prevBtn.click();
    }
  });
});
