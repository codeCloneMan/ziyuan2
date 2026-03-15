import DefaultTheme from 'vitepress/theme'
import RootPractice from '../components/RootPractice.vue'
import ModernPractice from '../components/ModernPractice.vue'
import Top500Practice from '../components/Top500Practice.vue'
import ErrorRadicalPractice from '../components/ErrorRadicalPractice.vue'
import TigerPractice from '../components/TigerPractice.vue'
import RadicalKeyboard from '../components/RadicalKeyboard.vue'
import ImageZoom from '../components/ImageZoom.vue'
import RootsGallery from '../components/RootsGallery.vue'
import RootCard from '../components/RootCard.vue'
import './custom.css'
// 导入公共练习样式
import '../styles/practice-styles.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // 注册全局组件
    app.component('RootPractice', RootPractice)
    app.component('ModernPractice', ModernPractice)
    app.component('Top500Practice', Top500Practice)
    app.component('ErrorRadicalPractice', ErrorRadicalPractice)
    app.component('TigerPractice', TigerPractice)
    app.component('RadicalKeyboard', RadicalKeyboard)
    app.component('ImageZoom', ImageZoom)
    app.component('RootsGallery', RootsGallery)
    app.component('RootCard', RootCard)
  },
}
