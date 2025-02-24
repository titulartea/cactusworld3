document.addEventListener("DOMContentLoaded", function () {
  // Supabase 설정
  const SUPABASE_URL = "https://zafxsqbfinfqvoupafrb.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZnhzcWJmaW5mcXZvdXBhZnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4ODY4NDUsImV4cCI6MjA1NTQ2Mjg0NX0.jwKCI7hUOtDqZ6iFAn1XxdAX_KXWtoMmHQByOcDF5eI";
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

  // 새 사진 옵션 모달 관련 요소
  const photoOptionsModal = document.getElementById("photoOptionsModal");
  const closePhotoOptionsModal = document.getElementById(
    "closePhotoOptionsModal"
  );

  // 수정 시 파일 변경용 숨김 파일 입력
  const editFileInput = document.getElementById("editFileInput");

  // 확대/축소 관련
  let currentScale = 1.0;
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");

  // 터치 이벤트 관련 (슬라이드와 핀치 구분)
  let modalTouchStartX = 0;
  let modalTouchStartY = 0; // 추가: 터치 시작 시 y좌표 저장
  let modalInitialDistance = 0;
  let isPinching = false;
  let slideDisabledUntil = 0;

  // 히스토리 관련 (뒤로가기 시 모달만 닫히도록)
  let modalHistoryPushed = false;

  // 기타 변수
  let offset = 0;
  const limit = 32;
  let currentIndex = 0;
  let currentPhotoRecord = null;
  let carouselIndex = 0;
  let carouselSlides = [];
  let carouselTimer = null;
  const carouselInterval = 2500;

  /* ---------- 브라우저 뒤로가기(popstate) 이벤트 (모바일 포함) ---------- */
  window.addEventListener("popstate", function (event) {
    if (imageModal.style.display === "flex") {
      imageModal.style.display = "none";
      modalHistoryPushed = false;
    }
  });

  const photoUploadLink = document.getElementById("photoUploadLink");

  photoUploadLink.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent default link behavior
    mainModal.style.display = "flex"; // Show the upload modal
    activateTab("galleryTab"); // Activate the gallery upload tab
  });

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

  document.addEventListener("click", function (event) {
    const menuCheckbox = document.getElementById("menuCheckbox");
    const menu = document.getElementById("menu");
    const menuToggle = document.getElementById("menuToggle");

    // 메뉴가 열려 있고, 클릭한 요소가 메뉴나 메뉴 토글이 아닐 경우
    if (
      menuCheckbox.checked &&
      !menu.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      menuCheckbox.checked = false; // 메뉴 닫기
    }
  });

  /* ---------- 갤러리 이미지 확대 및 현재 사진 정보 저장 ---------- */
  gallery.addEventListener("click", function (e) {
    const menuCheckbox = document.getElementById("menuCheckbox");
    if (menuCheckbox.checked) {
      // 메뉴가 열려 있을 때는 사진 모달이 열리지 않도록 함
      // 메뉴를 닫기 위해 체크박스를 해제
      menuCheckbox.checked = false;
      return;
    }
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
    // 확대/축소 초기화
    currentScale = 1.0;
    modalImage.style.transform = `scale(${currentScale})`;
    imageModal.style.display = "flex";
    // 모달 오픈 시 히스토리 상태 추가 (뒤로가기 눌렀을 때 모달만 닫힘)
    if (!modalHistoryPushed) {
      history.pushState({ modalOpen: true }, "");
      modalHistoryPushed = true;
    }
  }

  closeImageBtn.addEventListener("click", function () {
    imageModal.style.display = "none";
    if (modalHistoryPushed) {
      modalHistoryPushed = false;
      history.back();
    }
  });

  imageModal.addEventListener("click", function (e) {
    if (e.target === imageModal) {
      imageModal.style.display = "none";
      if (modalHistoryPushed) {
        modalHistoryPushed = false;
        history.back();
      }
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

  /* ---------- 터치 이벤트: 슬라이드/핀치 구분 및 아래로 스와이프하여 모달 닫기 ---------- */
  imageModal.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      modalInitialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      isPinching = true;
    } else if (e.touches.length === 1) {
      modalTouchStartX = e.touches[0].clientX;
      modalTouchStartY = e.touches[0].clientY; // 터치 시작 시 y 좌표도 저장
      isPinching = false;
    }
  });

  imageModal.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2) {
      isPinching = true;
    }
  });

  imageModal.addEventListener("touchend", function (e) {
    if (isPinching) {
      slideDisabledUntil = Date.now() + 1000; // 핀치 후 1초 동안 슬라이드 비활성화
      isPinching = false;
      return;
    }
    if (Date.now() < slideDisabledUntil) return;
    let modalTouchEndX = e.changedTouches[0].clientX;
    let modalTouchEndY = e.changedTouches[0].clientY;
    let diffX = modalTouchStartX - modalTouchEndX;
    let diffY = modalTouchEndY - modalTouchStartY;

    // 아래로 스와이프(수직 50px 이상, 수평 이동보다 큰 경우) 시 모달 닫기
    if (diffY > 50 && diffY > Math.abs(diffX)) {
      imageModal.style.display = "none";
      if (modalHistoryPushed) {
        modalHistoryPushed = false;
        history.back();
      }
      return;
    }

    // 좌우 스와이프 (50px 이상)
    if (Math.abs(diffX) > 50) {
      diffX > 0 ? nextBtn.click() : prevBtn.click();
    }
  });

  /* ---------- 확대/축소 버튼 동작 ---------- */
  zoomInBtn.addEventListener("click", function () {
    currentScale += 0.1;
    modalImage.style.transform = `scale(${currentScale})`;
  });

  zoomOutBtn.addEventListener("click", function () {
    if (currentScale > 0.3) {
      currentScale -= 0.1;
      modalImage.style.transform = `scale(${currentScale})`;
    }
  });

  /* ---------- 사진 옵션 모달 동작 ---------- */
  // 옵션 모달 열기: 이미지 모달 내 옵션 버튼 클릭 시
  openOptionBtn.addEventListener("click", function () {
    photoOptionsModal.style.display = "flex";
  });

  // 옵션 모달 닫기: "나가기" 버튼 클릭 시
  const btnExitOptions = document.getElementById("btnExitOptions");
  btnExitOptions.addEventListener("click", function () {
    photoOptionsModal.style.display = "none";
  });

  // 수정 버튼 처리
  const btnEditPhoto = document.getElementById("btnEditPhoto");
  btnEditPhoto.addEventListener("click", async function () {
    const pwd = prompt("수정을 위해 비밀번호를 입력하세요");
    if (pwd !== "firmament") {
      alert("비밀번호가 틀렸습니다!");
      return;
    }
    let modType = prompt(
      "어떤 수정을 원하시나요? 1) 사진 파일 변경 2) 설명 수정 (1 또는 2 입력)"
    );
    if (modType === "1") {
      editFileInput.click();
      editFileInput.onchange = async function (event) {
        if (event.target.files.length > 0) {
          const file = event.target.files[0];
          const filePath = `uploads/${Date.now()}_${file.name}`;
          const oldUrl = currentPhotoRecord.url;
          const { error } = await supabaseClient.storage
            .from("images")
            .upload(filePath, file);
          if (error) {
            alert("업로드 중 오류: " + error.message);
            return;
          }
          const { data: urlData, error: urlError } = supabaseClient.storage
            .from("images")
            .getPublicUrl(filePath);
          if (urlError) {
            alert("이미지 URL 가져오기 오류: " + urlError.message);
            return;
          }
          let newDescription = prompt(
            "사진 설명을 업데이트 하시겠습니까? (취소 시 기존 설명 유지)",
            currentPhotoRecord.description
          );
          newDescription =
            newDescription === null
              ? currentPhotoRecord.description
              : newDescription;
          const { error: updateError } = await supabaseClient
            .from("photos")
            .update({ url: urlData.publicUrl, description: newDescription })
            .eq("id", currentPhotoRecord.id);
          if (updateError) {
            alert("수정 오류: " + updateError.message);
            return;
          }
          const oldFilePath = getFilePathFromUrl(oldUrl);
          if (oldFilePath) {
            await supabaseClient.storage.from("images").remove([oldFilePath]);
          }
          alert("사진이 수정되었습니다.");
          currentPhotoRecord.element.querySelector("img").src =
            urlData.publicUrl;
          currentPhotoRecord.element
            .querySelector("img")
            .setAttribute("data-description", newDescription);
          modalImage.src = urlData.publicUrl;
          imageDescription.textContent = newDescription;
        }
      };
    } else if (modType === "2") {
      let newDescription = prompt(
        "새로운 사진 설명을 입력하세요",
        currentPhotoRecord.description
      );
      if (newDescription === null) return;
      const { error: updateError } = await supabaseClient
        .from("photos")
        .update({ description: newDescription })
        .eq("id", currentPhotoRecord.id);
      if (updateError) {
        alert("수정 오류: " + updateError.message);
        return;
      }
      alert("사진 설명이 수정되었습니다.");
      currentPhotoRecord.element
        .querySelector("img")
        .setAttribute("data-description", newDescription);
      imageDescription.textContent = newDescription;
    } else {
      alert("올바른 옵션을 선택하세요.");
    }
    photoOptionsModal.style.display = "none";
  });

  // 삭제 버튼 처리
  const btnDeletePhoto = document.getElementById("btnDeletePhoto");
  btnDeletePhoto.addEventListener("click", async function () {
    const pwd = prompt("삭제를 위해 비밀번호를 입력하세요");
    if (pwd !== "firmament") {
      alert("비밀번호가 틀렸습니다!");
      return;
    }
    photoOptionsModal.style.display = "none";
    const { error } = await supabaseClient
      .from("photos")
      .delete()
      .eq("id", currentPhotoRecord.id);
    if (error) {
      alert("삭제 오류: " + error.message);
      return;
    }
    const filePath = getFilePathFromUrl(currentPhotoRecord.url);
    if (filePath) {
      await supabaseClient.storage.from("images").remove([filePath]);
    }
    alert("사진이 삭제되었습니다.");
    currentPhotoRecord.element.remove();
    imageModal.style.display = "none";
    if (modalHistoryPushed) {
      modalHistoryPushed = false;
      history.back();
    }
  });

  function getFilePathFromUrl(url) {
    const marker = "/uploads/";
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.substring(index + 1);
  }

  /* ---------- 갤러리 캐러셀 로드 및 관리 ---------- */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
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
      carouselSlides.push(slide);
    });
  
    // Shuffle the slides
    shuffle(carouselSlides);
  
    // Append shuffled slides to the carousel
    carouselSlides.forEach(slide => carousel.appendChild(slide));
  
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
      diff > 0
        ? (carouselIndex = (carouselIndex + 1) % carouselSlides.length)
        : (carouselIndex =
            (carouselIndex - 1 + carouselSlides.length) %
            carouselSlides.length);
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
    if (!modalHistoryPushed) {
      history.pushState({ modalOpen: true }, "");
      modalHistoryPushed = true;
    }
  }
});

/* ---------- [추가] 알림 설정 버튼 동작 ---------- */
const notificationSettingsBtn = document.getElementById(
  "notificationSettingsBtn"
);

notificationSettingsBtn.addEventListener("click", function () {
  if (!("Notification" in window)) {
    alert("이 브라우저는 알림 기능을 지원하지 않습니다.");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      alert("알림이 활성화되었습니다.");
      subscribeToNotifications();
    } else {
      alert("알림 권한이 거부되었습니다.");
    }
  });
});

// Supabase Realtime 구독을 별도 함수로 분리 (알림 설정 버튼 클릭 시 호출)
function subscribeToNotifications() {
  supabaseClient
    .from("photos")
    .on("INSERT", (payload) => {
      console.log("새로운 사진 업로드:", payload);
      const { description, url } = payload.new;
      new Notification("새로운 사진 업로드", {
        body: description || "새로운 사진이 업로드되었습니다!",
        icon: url,
      });
    })
    .subscribe();
}


