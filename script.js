document.addEventListener("DOMContentLoaded", function () {
  // Supabase 프로젝트 URL과 키 (실제 값으로 교체)
  const SUPABASE_URL = "https://lkddstkbnxapncvdeynf.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGRzdGtibnhhcG5jdmRleW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NTkwMDYsImV4cCI6MjA1NDIzNTAwNn0.dFrdDQ-E_23MBe0YQwzNvHWsoShpqJwn7l26CdcJ1xk";

  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  const uploadBtn = document.getElementById("uploadBtn");
  const uploadModal = document.getElementById("uploadModal");
  const closeModal = document.querySelector(".close");
  const submitBtn = document.getElementById("submitBtn");
  const gallery = document.getElementById("gallery");
  const imageModal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const closeImageModal = document.getElementById("closeImageModal");
  const imageDescription = document.getElementById("imageDescription");

  let offset = 0;
  const limit = 10;

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

    const img = document.createElement("img");
    img.src = urlData.publicUrl;
    img.loading = "lazy";
    img.setAttribute("data-description", description);
    gallery.insertBefore(img, gallery.firstChild);

    uploadModal.style.display = "none";
  });

  gallery.addEventListener("click", function (e) {
    if (e.target.tagName === "IMG") {
      modalImage.src = e.target.src;
      imageDescription.textContent =
        e.target.getAttribute("data-description") || "설명이 없습니다.";
      imageModal.style.display = "flex";
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
      const img = document.createElement("img");
      img.src = item.url;
      img.loading = "lazy";
      img.setAttribute(
        "data-description",
        item.description || "설명이 없습니다."
      );
      gallery.appendChild(img);
    });

    offset += limit;
  }

  loadGallery();

  window.addEventListener("scroll", function () {
    if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 200
    ) {
      loadGallery();
    }
  });
});
