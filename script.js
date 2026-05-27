document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const imageList = document.getElementById('imageList');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const loadingDiv = document.getElementById('loading');

    // 1. SortableJS 초기화 (화면에서 드래그하여 순서 변경 가능)
    new Sortable(imageList, {
        animation: 150,
        ghostClass: 'sortable-ghost'
    });

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

    // 2. 파일 입력 처리
    imageInput.addEventListener('change', async (e) => {
        // 이름순 강제 정렬 로직 제거. 운영체제가 넘겨준 순서 그대로 가져옵니다.
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;

        loadingDiv.innerText = "이미지를 불러오는 중입니다...";
        loadingDiv.classList.remove('hidden');

        // 비동기 로딩으로 인해 순서가 뒤섞이는 것을 방지
        for (const file of files) {
            const imgDataUrl = await readFile(file);
            const img = await loadImage(imgDataUrl);

            const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const li = document.createElement('li');
            li.className = 'image-item';
            li.setAttribute('data-id', id);
            
            li.dataset.imgSrc = imgDataUrl;
            li.dataset.width = img.naturalWidth;
            li.dataset.height = img.naturalHeight;

            li.innerHTML = `
                <img src="${imgDataUrl}" alt="${file.name}">
                <button class="delete-btn" onclick="removeImage(this)">&times;</button>
            `;
            imageList.appendChild(li);
        }

        loadingDiv.classList.add('hidden');
        loadingDiv.innerText = "PDF를 생성하는 중입니다... 잠시만 기다려주세요."; 
        updateGenerateButton();
        
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

        generatePdfBtn.disabled = true;
        loadingDiv.classList.remove('hidden');

        try {
            const { jsPDF } = window.jspdf;
            let pdf = null;

            // DOM에 렌더링된 순서(화면에서 드래그로 맞춘 최종 순서)대로 PDF 생성
            items.forEach((item, index) => {
                const imgData = item.dataset.imgSrc;
                const width = parseInt(item.dataset.width);
                const height = parseInt(item.dataset.height);

                const format = imgData.substring("data:image/".length, imgData.indexOf(";base64"));
                const pdfFormat = (format === 'png') ? 'PNG' : 'JPEG';

                const orientation = width > height ? 'l' : 'p';

                if (index === 0) {
                    pdf = new jsPDF({
                        orientation: orientation,
                        unit: 'px',
                        format: [width, height]
                    });
                    pdf.addImage(imgData, pdfFormat, 0, 0, width, height);
                } else {
                    pdf.addPage([width, height], orientation);
                    pdf.addImage(imgData, pdfFormat, 0, 0, width, height);
                }
            });

            pdf.save('merged-document.pdf');

        } catch (error) {
            console.error("PDF 생성 중 오류 발생:", error);
            alert("PDF 생성 중 오류가 발생했습니다.");
        } finally {
            generatePdfBtn.disabled = false;
            loadingDiv.classList.add('hidden');
        }
    });
});
