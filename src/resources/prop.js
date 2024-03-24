//Parent
function App() {
  return (
    <div className="App">
      <Tool name="Product Manager" tool="Figma"/>
    </div>
  )
}

//Child
function Tool({name, tool}) {
  return (
    <div>
      <h1>My name is {name}.</h1>
      <p>My favorite design tool is {tool}.</p>
    </div>
  );
}
//Alternative
function Tool(props) {
  return (
    <div>
      <h1>My name is {props.name}</h1>
      <p>My favorite design tool is {props.tool}</p>
    </div>
  );
}
//default values 
Tool.defaultProps = {
  name: "Designer",
  tool: "Adobe XD"
}
//Props are IMMUTABLE & cause a re-render
function Tool({ name="Designer", tool="Adobe XD" }) {

}
export default Tool