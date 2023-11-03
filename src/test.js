const person = {
  name: 'John',
  age: 30,
  location: 'Dubai'
}
console.log(person)

const num = [11, 30, 22, 9, 19]
const sum = num.reduce((acc, curr) => acc + curr)
console.log(sum)

const filterNum = num.filter(num => num > 20)
console.log(filterNum)

// performance testing
// function() /*?. */ 