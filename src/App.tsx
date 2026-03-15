import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { PlantList } from './pages/PlantList'
import { PlantDetail } from './pages/PlantDetail'
import { PlantForm } from './pages/PlantForm'
import { Tasks } from './pages/Tasks'
import { Calendar } from './pages/Calendar'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="plants" element={<PlantList />} />
          <Route path="plants/new" element={<PlantForm />} />
          <Route path="plants/:id" element={<PlantDetail />} />
          <Route path="plants/:id/edit" element={<PlantForm />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
