import { Route, Routes } from "react-router-dom"
import FlowEditor from "./components/editor/FlowEditor"
import { div } from "motion/react-client"
import WorkflowsPage from "./components/workflows/WorkflowsPage"


function App() {


  return (
    <Routes>
      <Route path="/" element={<WorkflowsPage/>}/>
      <Route path='/workflows/:id' element={<FlowEditor/>}/>
    </Routes>
  )
   
   
}

export default App
