document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const imageList = document.getElementById('imageList');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const loadingDiv = document.getElementById('loading');

    let imageFiles = []; // 이미지 데이터를 담을 배열

    // 1. SortableJS 초기화 (드래그 앤 드롭 순서 변경)
    new Sortable(imageList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: () => {
            // UI에서 순서가 바뀌면 실제 배열의 순서도 동기화하기 위한 로직은 
            // PDF 생성 시 DOM의 순서를 직접 참조하도록 하여 간소화했습니다.
        }
    });

    // 2. 파일 입력 처리
    imageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            // 파일 읽기
            const reader = new FileReader();
            reader.onload = (event) => {
                const imgDataUrl = event.target.result;
                
                // 이미지 크기 추출을 위한 객체 생성
                const img = new Image();
                img.onload = () => {
                    const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    // DOM 요소 생성
                    const li = document.createElement('li');
                    li.className = 'image-item';
                    li.setAttribute('data-id', id);
                    
                    // PDF 렌더링 시 필요한 원본 데이터를 DOM에 저장
                    li.dataset.imgSrc = imgDataUrl;
                    li.dataset.width = img.naturalWidth;
                    li.dataset.height = img.naturalHeight;

                    li.innerHTML = `
                        <img src="${imgDataUrl}" alt="${file.name}">
                        <button class="delete-btn" onclick="removeImage(this)">&times;</button>
                    `;
                    imageList.appendChild(li);
                    updateGenerateButton();
                };
                img.src = imgDataUrl;
            };
            reader.readAsDataURL(file);
        }
        // input 초기화 (같은 파일을 다시 선택할 수 있도록)
        imageInput.value = '';
    });

    // 3. 버튼 활성화 상태 업데이트
    function updateGenerateButton() {
        const items = imageList.querySelectorAll('.image-item');
        generatePdfBtn.disabled = items.length === 0;
    }

    // 4. 개별 이미지 삭제 함수 (전역으로 열어둠)
    window.removeImage = function(btn) {
        const li = btn.closest('.image-item');
        li.remove();
        updateGenerateButton();
    };

    // 5. PDF 생성 및 다운로드
    generatePdfBtn.addEventListener('click', async () => {
        const items = imageList.querySelectorAll('.image-item');
        if (items.length === 0) return;

        // UI 상태 업데이트
        generatePdfBtn.disabled = true;
        loadingDiv.classList.remove('hidden');

        try {
            const { jsPDF } = window.jspdf;
            let pdf = null;

            // DOM에 렌더링된 순서대로 순회
            items.forEach((item, index) => {
                const imgData = item.dataset.imgSrc;
                // px 단위를 pt 또는 mm 단위로 변환하는 대신, 이미지 픽셀 크기에 맞춰 페이지 생성
                const width = parseInt(item.dataset.width);
                const height = parseInt(item.dataset.height);

                // 이미지 포맷 판별
                const format = imgData.substring("data:image/".length, imgData.indexOf(";base64"));
                const pdfFormat = (format === 'png') ? 'PNG' : 'JPEG';

                if (index === 0) {
                    // 첫 페이지는 jsPDF 초기화 시 크기 지정
                    // 방향(orientation): 가로가 더 길면 landscape(l), 세로가 더 길면 portrait(p)
                    const orientation = width > height ? 'l' : 'p';
                    pdf = new jsPDF({
                        orientation: orientation,
                        unit: 'px',
                        format: [width, height]
                    });
                    pdf.addImage(imgData, pdfFormat, 0, 0, width, height);
                } else {
                    // 두 번째 페이지부터는 새 페이지 추가
                    const orientation = width > height ? 'l' : 'p';
                    pdf.addPage([width, height], orientation);
                    pdf.addImage(imgData, pdfFormat, 0, 0, width, height);
                }
            });

            // 파일 저장
            pdf.save('merged-document.pdf');

        } catch (error) {
            console.error("PDF 생성 중 오류 발생:", error);
            alert("PDF 생성 중 오류가 발생했습니다.");
        } finally {
            // UI 상태 복구
            generatePdfBtn.disabled = false;
            loadingDiv.classList.add('hidden');
        }
    });
});