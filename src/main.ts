import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './tailwind.css'


const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router) // The router guard will call autoLogin()
app.mount('#app')
