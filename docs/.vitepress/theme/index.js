import DefaultTheme from 'vitepress/theme'
import RootPractice from '../components/RootPractice.vue'
import './custom.css'
import ImageZoom from '../components/ImageZoom.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('RootPractice', RootPractice)
    app.component('ImageZoom', ImageZoom)
  }
}