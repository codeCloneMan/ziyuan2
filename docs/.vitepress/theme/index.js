import DefaultTheme from 'vitepress/theme'
import RootPractice from '../components/RootPractice.vue'
import './custom.css'
import ImageZoom from '../components/ImageZoom.vue'
import Top500Practice from '../components/Top500Practice.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('RootPractice', RootPractice)
    app.component('ImageZoom', ImageZoom)
    app.component('Top500Practice', Top500Practice)
  }
}