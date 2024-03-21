const series = async () => {
  const results = await fetch(`users/${user.id}`)
  console.log('Results', results)
}

const parallel = async () => {
  const usersData = fetch('users') 
  const postsData = fetch('posts')

  const [users, posts] = await Promise.all(usersData, postsData)
  const [user, products] = await Promise.allSettled([axios.get('/users'), axios.get('/products')])
  console.log(users)
  console.log(posts)
}

export default class User extends React.Component {
  state = {
    users: [],
    userGroups: [],
    showProgress: false
  }

  loadData = () => {
    this.setState((prevState) => ({ ...prevState, showProgress: true }))
  
    Promise.all([api.getUsers(), api.getUserGroups()])
      .then(([users, userGroups]) => { //arguments in order with api call
        const sortUsers = users.sort((a, b) => a.id - b.id)
  
        this.setState((prevState) => ({
          ...prevState,
          users: sortUsers,
          userGroups,
          showProgress: false
        }))
      })
      .catch((error) => {
        console.log(error)
      })
  };

  componentDidMount() {
    this.loadData;
  }

  render() {
    return (
      <div></div>
    )
  }
}

const getProduct = async () => {
  fetch('https://fakestoreapi.com/products')
  .then((response) => {
    if (response.ok) {
      return response.json()
    }
  })
  .then((data) => {
    console.log('data', data)
  })
  .catch((err) => {
    console.error(err)
  })
};


