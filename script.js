class RandomPicker {
    constructor() {
        // 저장된 상태 복원 시도
        const savedState = this.loadStateFromCookie();
        if (savedState) {
            this.items = savedState.items;
            this.removedItems = savedState.removedItems;
        } else {
            this.items = this.generateInitialData();
            this.removedItems = [];
        }
        
        this.isSpinning = false;
        this.initializeElements();
        this.attachEventListeners();
        this.loadInitialData();
        this.updateCounts();
    }

    // 쿠키에 상태 저장
    saveStateToCookie() {
        const state = {
            items: this.items,
            removedItems: this.removedItems
        };
        const stateStr = JSON.stringify(state);
        const date = new Date();
        date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7일 유지
        document.cookie = `randomPickerState=${encodeURIComponent(stateStr)};expires=${date.toUTCString()};path=/`;
    }

    // 쿠키에서 상태 불러오기
    loadStateFromCookie() {
        const cookies = document.cookie.split(';');
        const stateCookie = cookies.find(cookie => cookie.trim().startsWith('randomPickerState='));
        if (stateCookie) {
            try {
                const stateStr = decodeURIComponent(stateCookie.split('=')[1]);
                return JSON.parse(stateStr);
            } catch (error) {
                console.error('쿠키 상태 복원 중 오류:', error);
                return null;
            }
        }
        return null;
    }
        
    async loadInitialData() {
        try {
            const response = await fetch('/djnames.csv');
            const text = await response.text();
            const rows = text.split('\n');
            this.items = rows
                .filter(row => row.trim() !== '')
                .map((row, index) => ({
                    id: index + 1,
                    value: row.trim().replace(/"/g, '').replace(/,.*$/, '')
                }));
        } catch (error) {
            console.error('초기 데이터 로드 중 오류:', error);
            this.items = this.generateInitialData();
        }

        this.removedItems = [];
        this.updateDisplay();
        this.updateCounts();
        this.updateRecentItems();
        this.saveStateToCookie(); // 초기 상태 저장
    }

    generateInitialData() {
        return Array.from({ length: 150 }, (_, i) => ({
            id: i + 1,
            value: `항목 ${i + 1}`
        }));
    }

    initializeElements() {
        this.fileInput = document.getElementById('fileInput');
        this.pickButton = document.getElementById('pickButton');
        this.resetButton = document.getElementById('resetButton');
        this.recentItems = document.querySelector('.recent-items');
        this.remainingCount = document.getElementById('remainingCount');
        this.selectedCount = document.getElementById('selectedCount');
        this.pickerContent = this.pickButton.querySelector('.picker-content');
    }

    attachEventListeners() {
        this.fileInput.addEventListener('change', this.handleFileUpload.bind(this));
        this.pickButton.addEventListener('click', this.selectRandomItem.bind(this));
        this.resetButton.addEventListener('click', this.resetItems.bind(this));
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const text = await file.text();
                const rows = text.split('\n');
                this.items = rows
                    .filter(row => row.trim() !== '')
                    .map((row, index) => ({
                        id: index + 1,
                        value: row.trim().replace(/"/g, '').replace(/,.*$/, '')
                    }));
                
                this.removedItems = [];
                this.updateDisplay();
                this.updateCounts();
                this.updateRecentItems();
                this.saveStateToCookie(); // 파일 업로드 후 상태 저장
            } catch (error) {
                console.error('파일 처리 중 오류 발생:', error);
                alert('파일을 처리하는 중 오류가 발생했습니다.');
            }
        }
    }

    updateDisplayItems(currentTime, startTime, duration, finalIndex) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const delay = Math.max(50, 300 * easeOutQuart);

        if (progress < 1) {
            let randomItems = Array.from({length: 3}, () => 
                this.items[Math.floor(Math.random() * this.items.length)]
            );

            if (progress > 0.8) {
                randomItems[1] = this.items[finalIndex];
            }

            this.updateDisplay(randomItems);
            
            setTimeout(() => {
                requestAnimationFrame((now) => 
                    this.updateDisplayItems(now, startTime, duration, finalIndex)
                );
            }, delay);
        } else {
            this.finishSelection(finalIndex);
        }
    }

    updateDisplay(items = null) {
        const content = this.pickerContent;
        if (items) {
            content.innerHTML = `
                <div class="item-prev">${items[0]?.value || ''}</div>
                <div class="item-current">${items[1]?.value || ''}</div>
                <div class="item-next">${items[2]?.value || ''}</div>
            `;
        } else {
            content.innerHTML = `
                <div class="item-current">🎰 오늘 내 이름은...</div>
            `;
        }
    }

    selectRandomItem() {
        if (this.isSpinning || this.items.length === 0) {
            if (this.items.length === 0) {
                alert('모든 항목이 선택되었습니다!');
            }
            return;
        }

        this.pickButton.classList.remove('selected');
        this.isSpinning = true;
        this.pickButton.classList.add('spinning');

        const finalIndex = Math.floor(Math.random() * this.items.length);
        
        requestAnimationFrame((startTime) => {
            this.updateDisplayItems(startTime, startTime, 3000, finalIndex);
        });
    }

    finishSelection(finalIndex) {
        const selectedItem = this.items[finalIndex];
        this.removedItems.push(selectedItem);
        this.items = this.items.filter(item => item.id !== selectedItem.id);
        
        this.isSpinning = false;
        this.pickButton.classList.remove('spinning');
        this.pickButton.classList.add('selected');
        this.pickButton.classList.add('bounce');
        
        setTimeout(() => {
            this.pickButton.classList.remove('bounce');
        }, 1000);

        this.updateCounts();
        this.updateRecentItems();
        this.updateDisplay([null, selectedItem, null]);
        this.saveStateToCookie(); // 선택 완료 후 상태 저장
    }

    resetItems() {
        this.items = [...this.items, ...this.removedItems];
        this.removedItems = [];
        this.pickButton.classList.remove('selected');
        this.updateDisplay();
        this.updateCounts();
        this.updateRecentItems();
        this.saveStateToCookie(); // 리셋 후 상태 저장
    }

    updateCounts() {
        this.remainingCount.textContent = this.items.length;
        this.selectedCount.textContent = this.removedItems.length;
    }

    updateRecentItems() {
        const recentItemsContainer = document.querySelector('.recent-items');
        if (!recentItemsContainer) {
            console.error('Recent items container not found');
            return;
        }

        if (this.removedItems.length > 0) {
            recentItemsContainer.innerHTML = this.removedItems
                .slice()
                .reverse()
                .map((item, index) => `
                    <div class="recent-item">
                        ${item.value}
                        <span class="recent-item-number">#${this.removedItems.length - index}</span>
                    </div>
                `)
                .join('');
        } else {
            recentItemsContainer.innerHTML = `
                <div class="recent-item">
                    선택된 항목이 없습니다
                </div>
            `;
        }

        recentItemsContainer.scrollTop = 0;
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new RandomPicker();
});

// 클릭 이벤트 처리
document.addEventListener('DOMContentLoaded', function() {
    const recentTitle = document.querySelector('.recent-title');
    const recentInner = document.querySelector('.recent-inner');
    
    if (recentTitle && recentInner) {
        recentTitle.addEventListener('click', function() {
            const isVisible = recentInner.style.display === 'block';
            recentInner.style.display = isVisible ? 'none' : 'block';
            this.classList.toggle('open');
        });
    }
});
