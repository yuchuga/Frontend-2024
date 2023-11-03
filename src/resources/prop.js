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
      <h1>My name is {props.name}.</h1>
      <p>My favorite design tool is {props.tool}.</p>
    </div>
  );
}
//default values 
Tool.defaultProps = {
  name: "Designer",
  tool: "Adobe XD"
}
//Props are IMMUTABLE & cause a re-render
function Tool({name="Designer", tool="Adobe XD"}) {

}
export default Tool

toggle = (e) => {
  const { name } = e.target;
  this.setState(prevState => ({
      [name]: !prevState[name]
    }),
    () => console.log(`this.state`, this.state) //debug class component state
  );
};

export default class User extends React.Component {
  constructor(props) { //use props in constructor only. this.props in other sections
    super()
  }
}