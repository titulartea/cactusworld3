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

  // 모달 열기: 업로드 버튼 클릭 시 업로드 모달 표시
  uploadBtn.addEventListener("click", function () {
    uploadModal.style.display = "flex";
  });

  // 모달 닫기: X 버튼 클릭 시 모달 숨기기
  closeModal.addEventListener("click", function () {
    uploadModal.style.display = "none";
  });

  // 파일 업로드 및 갤러리에 추가
  submitBtn.addEventListener("click", async function () {
    const password = document.getElementById("password").value;
    const fileInput = document.getElementById("fileInput");

    // 비밀번호 확인
    if (password !== "firmament") {
      alert("비밀번호가 틀렸습니다!");
      return;
    }

    // 파일 선택 여부 확인
    if (fileInput.files.length === 0) {
      alert("사진을 선택해주세요!");
      return;
    }

    const file = fileInput.files[0];
    // 파일 경로 생성: uploads 폴더 아래에 고유한 파일명 생성
    const filePath = `uploads/${Date.now()}_${file.name}`;

    // Supabase Storage에 파일 업로드 (버킷 이름은 'images'로 가정)
    const { data, error } = await supabaseClient.storage
      .from("images")
      .upload(filePath, file);

    if (error) {
      alert("업로드 중 오류가 발생했습니다: " + error.message);
      return;
    }

    // 업로드된 파일의 공개 URL 가져오기
    const { data: urlData, error: urlError } = supabaseClient.storage
      .from("images")
      .getPublicUrl(filePath);

    if (urlError) {
      alert(
        "이미지 URL을 가져오는 중 오류가 발생했습니다: " + urlError.message
      );
      return;
    }

    // 갤러리에 이미지 추가 (새로운 이미지를 첫 번째로 추가)
    const img = document.createElement("img");
    img.src = urlData.publicUrl;

    // 새 이미지를 맨 위에 추가하기 위해 firstChild 앞에 삽입
    gallery.insertBefore(img, gallery.firstChild);

    // 업로드 후 모달 닫기
    uploadModal.style.display = "none";
  });

  // 갤러리 내의 이미지 클릭 시 확대 모달 열기
  gallery.addEventListener("click", function (e) {
    if (e.target.tagName === "IMG") {
      modalImage.src = e.target.src;
      imageModal.style.display = "flex";
    }
  });

  // 확대 모달 닫기: X 버튼 클릭
  closeImageModal.addEventListener("click", function () {
    imageModal.style.display = "none";
  });

  // 모달 바깥 클릭 시 확대 모달 닫기
  imageModal.addEventListener("click", function (e) {
    if (e.target === imageModal) {
      imageModal.style.display = "none";
    }
  });

  // 페이지 로드시 기존 업로드된 이미지들을 갤러리에 불러오기
  async function loadGallery() {
    const { data, error } = await supabaseClient
      .from("photos") // 'photos' 테이블에서 사진 목록 가져오기
      .select("*")
      .order("created_at", { ascending: false }); // created_at 기준으로 내림차순 정렬

    if (error) {
      console.error("갤러리 로드 오류:", error.message);
      return;
    }

    // 갤러리에 이미지를 표시
    data.forEach((item) => {
      const img = document.createElement("img");
      img.src = item.url; // 업로드된 사진 URL
      gallery.appendChild(img);
    });
  }

  loadGallery();
});
