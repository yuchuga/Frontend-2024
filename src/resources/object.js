const person = {
  name: 'Sally',
  age: 32,
  food: 'Apple',
  address: {
    city: 'Singapore',
    state: 'Balestier'
  }
};

const person2 = {
  age: 22,
  food: 'Watermelon'
}
//destructure object
const { name, age, ...rest } = person
// console.log(name)
// console.log(age)
// console.log(rest)

//concat 2 objects
const person3 = {...person, ...person2}
// console.log(person3)
const printUser = ({ name, age, food = 'Watermelon' }) => {
  console.log(`Name is ${name}, Age is ${age}, Food is ${food}`)
}
printUser(person) //note food value is not overwritten