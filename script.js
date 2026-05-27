document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const imageList = document.getElementById('imageList');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const loadingDiv = document.getElementById('loading');

    // 1. SortableJS 초기화 (드래그 앤 드롭 순서 변경)
    new Sortable(imageList, {
        animation: 150,
        ghostClass: 'sortable-ghost'
    });

    // --- 추가된 부분: 이미지를 비동기적으로 안전하게 읽어오는 함수 ---
    const readFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    const loadImage = (src) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });
    };
    // -----------------------------------------------------------------

    // 2. 파일 입력 처리 (순서 보장 로직 적용)
    imageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 이미지 로딩 중 안내 표시
        loadingDiv.innerText = "이미지를 불러오는 중입니다...";
        loadingDiv.classList.remove('hidden');

        // for...of 와 await를 사용하여 '선택한 순서대로' 차례대로 화면에 추가
        for (const file of files) {
            const imgDataUrl = await readFile(file);
            const img = await loadImage(imgDataUrl);

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
        }

        // 로딩 안내 원상 복구 및 버튼 활성화
        loadingDiv.classList.add('hidden');
        loadingDiv.innerText = "PDF를 생성하는 중입니다... 잠시만 기다려주세요."; 
        updateGenerateButton();
        
        // input 초기화 (같은 파일을 다시 선택할 수 있도록)
        imageInput.value = '';
    });

    // 3. 버튼 활성화 상태 업데이트
    function updateGenerateButton() {
        const items = imageList.querySelectorAll('.image-item');
        generatePdfBtn.disabled = items.length === 0;
    }

    // 4. 개별 이미지 삭제 함수
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

            // DOM에 렌더링된 순서(드래그 앤 드롭으로 변경된 순서 포함)대로 순회
            items.forEach((item, index) => {
                const imgData = item.dataset.imgSrc;
                const width = parseInt(item.dataset.width);
                const height = parseInt(item.dataset.height);

                // 이미지 포맷 판별
                const format = imgData.substring("data:image/".length, imgData.indexOf(";base64"));
                const pdfFormat = (format === 'png') ? 'PNG' : 'JPEG';

                const orientation = width > height ? 'l' : 'p';

                if (index === 0) {
                    // 첫 페이지
                    pdf = new jsPDF({
                        orientation: orientation,
                        unit: 'px',
                        format: [width, height]
                    });
                    pdf.addImage(imgData, pdfFormat, 0, 0, width, height);
                } else {
                    // 두 번째 페이지부터 추가
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
