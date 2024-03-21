/* Method */
const circle = {
  radius: 20,
  diameter() {
    return this.radius * 2
  },
  perimeter: function() { //note: return NaN for arrow function
    return 2 * Math.P * this.radius
  }
}
// console.log(circle.diameter()) //40
// console.log(circle.perimeter()) //125.6

/* Find missing number in array size N using arithmetic progression formula n(n+1)/2 */
const findMissingNumber = (array, length) => {
  let result = Math.floor((length + 1) * (length + 2) / 2) 
  for (let i = 0; i < length; i++) {
    result -= array[i]
  }
  return result
};

const findMissingNumber2 = (array) => {
  const n = array.length + 1
  const expectSum = (n * (n + 1)) / 2
  const actualSum = array.reduce((acc, curr) => acc + curr)
  return expectSum - actualSum
};

const array1 = [1, 2, 4, 6, 3, 7, 8]
const missingNumber = findMissingNumber2(array1)
// console.log('missingNumber', missingNumber) //5
