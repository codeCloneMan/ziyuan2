---
outline: deep
---

# 1.31版本字根练习

<style scoped>
.practice-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.button-group {
  text-align: center;
  margin: 20px 0;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.mode-button {
  padding: 10px 20px;
  font-size: 18px;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.mode-button.order {
  background: #0099ff;
}

.mode-button.order:hover {
  background: #0077cc;
}

.mode-button.random {
  background: #ff6600;
}

.mode-button.random:hover {
  background: #e65c00;
}

.progress-display {
  text-align: center;
  font-size: 20px;
  margin: 10px 0;
  color: #333;
  font-weight: bold;
}

.image-container {
  width: 150px;
  height: 150px;
  border: 0px solid #333;
  padding: 10px;
  margin: 30px auto;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-container img {
  max-width: 126px;
  max-height: 126px;
  object-fit: contain;
}

.input-container {
  text-align: center;
  margin-top: 10px;
}

.code-input {
  width: 680px;
  padding: 8px;
  font-size: 36px;
  text-align: center;
  border: 1px solid #999;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.code-input:focus {
  outline: none;
  border-color: #0099ff;
  box-shadow: 0 0 0 3px rgba(0, 153, 255, 0.2);
}

.code-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f5f5f5;
}

.tip-message {
  font-size: 24px;
  margin: 10px 0;
  font-weight: bold;
  transition: all 0.3s ease;
}

.tip-success {
  color: #00cc00;
}

.tip-error {
  color: #ff3300;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
    align-items: center;
  }
  
  .code-input {
    width: 100%;
    max-width: 400px;
    font-size: 28px;
  }
  
  .image-container {
    width: 120px;
    height: 120px;
  }
  
  .image-container img {
    max-width: 100px;
    max-height: 100px;
  }
  
  .tip-message {
    font-size: 18px;
  }
}
</style>

<div class="practice-container">
  <!-- 模式切换按钮区域 -->
  <div class="button-group">
    <button 
      @click="switchMode('order')"
      class="mode-button order"
      type="button"
      aria-label="切换到顺序模式"
    >
      顺序模式
    </button>
    <button 
      @click="switchMode('random')"
      class="mode-button random"
      type="button"
      aria-label="切换到乱序模式"
    >
      乱序模式
    </button>
  </div>

  <!-- 练习数展示 -->
  <div class="progress-display">
    练习进度：{{ practiceCount }} / {{ totalCount }}
  </div>

  <!-- 图片展示区 -->
  <div class="image-container">
    <img ref="ziGenImg" src="/dirpng/a(1).png" alt="字根图片">
  </div>

  <div class="input-container">
    <input 
      ref="codeInput"
      v-model="inputValue"
      maxlength="1"
      placeholder="输入1个字母自动验证" 
      class="code-input"
      autocomplete="off"
      spellcheck="false"
      @input="handleInput"
      @focus="hideTip"
      @keydown.enter="handleInput"
      :disabled="isDisabled"
      :aria-label="'输入字根编码'"
    >
    <p 
      ref="errorTip" 
      class="tip-message"
      :class="tipType === 'success' ? 'tip-success' : 'tip-error'"
      role="status"
      aria-live="polite"
    >
      {{ tipText }}
    </p>
  </div>
</div>

<script setup>
import { ref, onMounted, computed } from 'vue';

// 基础响应式变量
const inputValue = ref('');       
const tipText = ref('');          
const tipType = ref('');          
const ziGenImg = ref(null);       
const codeInput = ref(null);      
const isDisabled = ref(false);    
const practiceMode = ref('order');
const practiceCount = ref(0);     
const currentImgIndex = ref(0);   

// 原始图片列表
const originalImgList = [
    '/dirpng/a(1).png', '/dirpng/a(14).png', '/dirpng/a(15).png', '/dirpng/a(16).png', '/dirpng/a(2).png', '/dirpng/a(3).png', '/dirpng/a(7).png', '/dirpng/b(1).png', '/dirpng/b(2).png', '/dirpng/b(3).png', '/dirpng/b(4).png', '/dirpng/b(5).png', '/dirpng/b(6).png', '/dirpng/c(1).png', '/dirpng/c(10).png', '/dirpng/c(11).png', '/dirpng/c(12).png', '/dirpng/c(13).png', '/dirpng/c(2).png', '/dirpng/c(3).png', '/dirpng/c(4).png', '/dirpng/c(5).png', '/dirpng/c(6).png', '/dirpng/c(7).png', '/dirpng/c(8).png', '/dirpng/c(9).png', '/dirpng/d(1).png', '/dirpng/d(10).png', '/dirpng/d(11).png', '/dirpng/d(12).png', '/dirpng/d(13).png', '/dirpng/d(14).png', '/dirpng/d(15).png', '/dirpng/d(16).png', '/dirpng/d(17).png', '/dirpng/d(18).png', '/dirpng/d(19).png', '/dirpng/d(2).png', '/dirpng/d(20).png', '/dirpng/d(21).png', '/dirpng/d(3).png', '/dirpng/d(4).png', '/dirpng/d(5).png', '/dirpng/d(6).png', '/dirpng/d(7).png', '/dirpng/d(8).png', '/dirpng/d(9).png', '/dirpng/e(1).png', '/dirpng/e(10).png', '/dirpng/e(11).png', '/dirpng/e(12).png', '/dirpng/e(13).png', '/dirpng/e(14).png', '/dirpng/e(15).png', '/dirpng/e(16).png', '/dirpng/e(17).png', '/dirpng/e(18).png', '/dirpng/e(2).png', '/dirpng/e(3).png', '/dirpng/e(4).png', '/dirpng/e(5).png', '/dirpng/e(6).png', '/dirpng/e(7).png', '/dirpng/e(8).png', '/dirpng/e(9).png', '/dirpng/f(1).png', '/dirpng/f(10).png', '/dirpng/f(11).png', '/dirpng/f(13).png', '/dirpng/f(14).png', '/dirpng/f(2).png', '/dirpng/f(4).png', '/dirpng/f(5).png', '/dirpng/f(6).png', '/dirpng/f(9).png', '/dirpng/g(10).png', '/dirpng/g(11).png', '/dirpng/g(12).png','/dirpng/g(13).png', '/dirpng/g(14).png', '/dirpng/g(15).png', '/dirpng/g(16).png', '/dirpng/g(17).png', '/dirpng/g(2).png', '/dirpng/g(3).png', '/dirpng/g(4).png', '/dirpng/g(5).png', '/dirpng/g(6).png', '/dirpng/g(7).png', '/dirpng/g(8).png', '/dirpng/g(9).png', '/dirpng/h(1).png', '/dirpng/h(10).png', '/dirpng/h(11).png', '/dirpng/h(12).png', '/dirpng/h(13).png', '/dirpng/h(14).png', '/dirpng/h(15).png', '/dirpng/h(6).png', '/dirpng/h(7).png', '/dirpng/h(8).png', '/dirpng/h(9).png', '/dirpng/i(1).png', '/dirpng/i(10).png', '/dirpng/i(11).png', '/dirpng/i(12).png', '/dirpng/i(13).png', '/dirpng/i(14).png', '/dirpng/i(15).png', '/dirpng/i(16).png', '/dirpng/i(17).png', '/dirpng/i(18).png', '/dirpng/i(19).png', '/dirpng/i(2).png', '/dirpng/i(20).png', '/dirpng/i(21).png', '/dirpng/i(22).png', '/dirpng/i(3).png', '/dirpng/i(4).png', '/dirpng/i(5).png', '/dirpng/i(6).png', '/dirpng/i(7).png', '/dirpng/i(8).png', '/dirpng/i(9).png', '/dirpng/j(1).png', '/dirpng/j(10).png', '/dirpng/j(11).png', '/dirpng/j(12).png', '/dirpng/j(13).png', '/dirpng/j(14).png', '/dirpng/j(15).png', '/dirpng/j(16).png', '/dirpng/j(17).png', '/dirpng/j(18).png', '/dirpng/j(19).png', '/dirpng/j(2).png', '/dirpng/j(20).png', '/dirpng/j(21).png', '/dirpng/j(22).png', '/dirpng/j(23).png', '/dirpng/j(24).png', '/dirpng/j(25).png', '/dirpng/j(4).png', '/dirpng/j(5).png', '/dirpng/j(6).png', '/dirpng/j(7).png', '/dirpng/j(8).png', '/dirpng/j(9).png', '/dirpng/k(1).png', '/dirpng/k(10).png', '/dirpng/k(2).png', '/dirpng/k(3).png', '/dirpng/k(4).png', '/dirpng/k(5).png', '/dirpng/k(6).png', '/dirpng/k(7).png', '/dirpng/k(8).png', '/dirpng/k(9).png', '/dirpng/l(1).png', '/dirpng/l(10).png', '/dirpng/l(11).png', '/dirpng/l(12).png', '/dirpng/l(13).png', '/dirpng/l(14).png', '/dirpng/l(15).png', '/dirpng/l(16).png', '/dirpng/l(17).png', '/dirpng/l(2).png', '/dirpng/l(3).png', '/dirpng/l(4).png', '/dirpng/l(5).png', '/dirpng/l(6).png', '/dirpng/l(7).png', '/dirpng/l(8).png', '/dirpng/l(9).png', '/dirpng/m(1).png', '/dirpng/m(3).png', '/dirpng/m(4).png', '/dirpng/m(5).png', '/dirpng/m(6).png', '/dirpng/m(7).png', '/dirpng/m(8).png', '/dirpng/n(1).png', '/dirpng/n(10).png', '/dirpng/n(2).png', '/dirpng/n(3).png', '/dirpng/n(4).png', '/dirpng/n(5).png', '/dirpng/n(6).png', '/dirpng/n(7).png', '/dirpng/n(8).png', '/dirpng/n(9).png', '/dirpng/o(1).png', '/dirpng/o(10).png', '/dirpng/o(11).png', '/dirpng/o(12).png', '/dirpng/o(13).png', '/dirpng/o(14).png', '/dirpng/o(15).png', '/dirpng/o(16).png', '/dirpng/o(17).png', '/dirpng/o(18).png', '/dirpng/o(19).png', '/dirpng/o(2).png', '/dirpng/o(20).png', '/dirpng/o(21).png', '/dirpng/o(22).png', '/dirpng/o(3).png', '/dirpng/o(4).png', '/dirpng/o(5).png', '/dirpng/o(6).png', '/dirpng/o(7).png', '/dirpng/o(8).png', '/dirpng/o(9).png', '/dirpng/p(1).png', '/dirpng/p(10).png', '/dirpng/p(2).png', '/dirpng/p(3).png', '/dirpng/p(4).png', '/dirpng/p(5).png', '/dirpng/p(6).png', '/dirpng/p(7).png', '/dirpng/p(8).png','/dirpng/p(9).png', '/dirpng/q(2).png', '/dirpng/q(3).png', '/dirpng/r(1).png', '/dirpng/r(10).png', '/dirpng/r(11).png', '/dirpng/r(12).png', '/dirpng/r(13).png', '/dirpng/r(14).png', '/dirpng/r(2).png', '/dirpng/r(4).png', '/dirpng/r(5).png', '/dirpng/r(6).png', '/dirpng/r(7).png', '/dirpng/r(8).png', '/dirpng/r(9).png', '/dirpng/s(17).png', '/dirpng/s(18).png', '/dirpng/s(19).png', '/dirpng/s(2).png', '/dirpng/s(20).png', '/dirpng/s(21).png', '/dirpng/t(1).png', '/dirpng/t(12).png', '/dirpng/t(13).png', '/dirpng/t(14).png', '/dirpng/t(15).png', '/dirpng/t(16).png', '/dirpng/t(17).png', '/dirpng/t(2).png', '/dirpng/t(3).png', '/dirpng/t(5).png', '/dirpng/t(6).png', '/dirpng/u(1).png', '/dirpng/u(10).png', '/dirpng/u(11).png', '/dirpng/u(12).png', '/dirpng/u(13).png', '/dirpng/u(14).png', '/dirpng/u(15).png', '/dirpng/u(16).png', '/dirpng/u(17).png', '/dirpng/u(18).png', '/dirpng/u(19).png', '/dirpng/u(2).png', '/dirpng/u(20).png', '/dirpng/u(22).png', '/dirpng/u(23).png', '/dirpng/u(3).png', '/dirpng/u(4).png', '/dirpng/u(5).png', '/dirpng/u(6).png', '/dirpng/u(7).png', '/dirpng/u(8).png', '/dirpng/u(9).png', '/dirpng/v(1).png', '/dirpng/v(10).png', '/dirpng/v(11).png', '/dirpng/v(12).png', '/dirpng/v(13).png', '/dirpng/v(14).png', '/dirpng/v(2).png', '/dirpng/v(3).png', '/dirpng/v(4).png', '/dirpng/v(5).png', '/dirpng/v(6).png', '/dirpng/v(7).png', '/dirpng/v(8).png', '/dirpng/v(9).png', '/dirpng/w(1).png', '/dirpng/w(10).png', '/dirpng/w(11).png', '/dirpng/w(12).png', '/dirpng/w(13).png', '/dirpng/w(14).png', '/dirpng/w(15).png', '/dirpng/w(16).png', '/dirpng/w(17).png', '/dirpng/w(18).png', '/dirpng/w(19).png', '/dirpng/w(2).png', '/dirpng/w(20).png', '/dirpng/w(21).png', '/dirpng/w(22).png', '/dirpng/w(23).png', '/dirpng/w(24).png', '/dirpng/w(25).png', '/dirpng/w(3).png', '/dirpng/w(4).png', '/dirpng/w(5).png', '/dirpng/w(6).png', '/dirpng/w(7).png', '/dirpng/w(8).png', '/dirpng/w(9).png', '/dirpng/x(1).png', '/dirpng/x(10).png', '/dirpng/x(11).png', '/dirpng/x(2).png', '/dirpng/x(3).png', '/dirpng/x(4).png','/dirpng/x(5).png', '/dirpng/x(6).png', '/dirpng/x(7).png', '/dirpng/x(8).png', '/dirpng/x(9).png', '/dirpng/y(1).png', '/dirpng/y(10).png', '/dirpng/y(11).png', '/dirpng/y(12).png', '/dirpng/y(13).png', '/dirpng/y(14).png', '/dirpng/y(15).png', '/dirpng/y(16).png', '/dirpng/y(17).png', '/dirpng/y(18).png', '/dirpng/y(19).png', '/dirpng/y(2).png', '/dirpng/y(3).png', '/dirpng/y(4).png', '/dirpng/y(5).png', '/dirpng/y(6).png', '/dirpng/y(7).png', '/dirpng/y(8).png', '/dirpng/y(9).png', '/dirpng/z(1).png', '/dirpng/z(10).png', '/dirpng/z(11).png', '/dirpng/z(12).png', '/dirpng/z(13).png', '/dirpng/z(14).png', '/dirpng/z(15).png', '/dirpng/z(16).png', '/dirpng/z(17).png', '/dirpng/z(2).png', '/dirpng/z(3).png', '/dirpng/z(4).png', '/dirpng/z(5).png', '/dirpng/z(7).png', '/dirpng/z(8).png', '/dirpng/z(9).png'
];

// 当前使用的图片列表
const currentImgList = ref([...originalImgList]);

// 总数计算属性
const totalCount = computed(() => currentImgList.value.length);

// 洗牌算法
const shuffleArray = (arr) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

// 切换练习模式
const switchMode = (mode) => {
    practiceMode.value = mode;
    practiceCount.value = 0;
    currentImgIndex.value = 0;
    tipText.value = '';
    isDisabled.value = false;
    
    if (mode === 'order') {
        currentImgList.value = [...originalImgList];
        tipText.value = '✅ 已切换为顺序模式，开始练习！';
        tipType.value = 'success';
    } else {
        currentImgList.value = shuffleArray(originalImgList);
        tipText.value = '✅ 已切换为乱序模式，开始练习！';
        tipType.value = 'success';
    }
    ziGenImg.value.src = currentImgList.value[currentImgIndex.value];
    setTimeout(() => hideTip(), 3000);
};

// 提取图片首字母
const getImgFirstLetter = (imgPath) => {
    const fileName = imgPath.split('/').pop() || '';
    const firstLetter = fileName.charAt(0).toLowerCase();
    return firstLetter;
};

// 输入防抖验证
let verifyTimer = null;
const handleInput = () => {
    if (isDisabled.value) return;
    clearTimeout(verifyTimer);
    if (inputValue.value.length === 1) {
        verifyTimer = setTimeout(() => {
            verifyCode();
        }, 100);
    } else {
        hideTip();
    }
};

// 核心验证逻辑（修正提示时长+边框）
const verifyCode = () => {
    if (!inputValue.value || isDisabled.value) return; 

    const currentImgPath = ziGenImg.value.src;
    const currentLetter = getImgFirstLetter(currentImgPath);
    const userInput = inputValue.value.toLowerCase();

    if (userInput === currentLetter) {
        practiceCount.value += 1;
        tipText.value = `✅ 正确！已切换到下一个字根`;
        tipType.value = 'success';
        // 移除边框变色（因为外层border是0px）
        // ziGenImg.value.style.border = '1px solid #00cc00';
        
        // 完成全部练习
        if (practiceCount.value === totalCount.value) {
            tipText.value = `🎉 恭喜！完成全部${totalCount.value}个字根练习！`;
            tipType.value = 'success';
            isDisabled.value = true;
            // 3秒后统一解禁+清空提示+重置，确保提示和禁用同步消失
            setTimeout(() => {
                isDisabled.value = false;
                practiceCount.value = 0;
                currentImgIndex.value = 0;
                ziGenImg.value.src = currentImgList.value[0];
                tipText.value = ''; // 此时才清空提示
                tipType.value = '';
            }, 3000);
            inputValue.value = '';
            return;
        }

        // 未完成：切换下一张
        currentImgIndex.value = (currentImgIndex.value + 1) % currentImgList.value.length;
        ziGenImg.value.src = currentImgList.value[currentImgIndex.value];
        inputValue.value = '';
        
        // 3秒后清空普通正确提示（保留完成提示）
        setTimeout(() => {
            if (practiceCount.value < totalCount.value) {
                hideTip();
            }
        }, 3000);
    } else {
        tipText.value = `❌ 错误！正确字母是：${currentLetter}`;
        tipType.value = 'error';
        inputValue.value = '';
        setTimeout(() => hideTip(), 3000);
    }
};

// 隐藏提示
const hideTip = () => {
    // 完成练习时不主动清空提示（由3秒后统一处理）
    if (!isDisabled.value) {
        tipText.value = '';
        tipType.value = '';
    }
};

// 初始化
onMounted(() => {
    ziGenImg.value.src = currentImgList.value[currentImgIndex.value];
    practiceCount.value = 0;
});
</script>