/*eslint-disable */
import axios from 'axios'
import { showAlert } from './alert'
const stripe = Stripe(`pk_test_51M5lFhEY5VB3iQh4WyZUPcwFF9pbhMwW40O3YAjVUhA4rSWK3BLCcLl14kUae3q2caAeI64wPiPqkg6h7CnHX8co00eagaiUUB`)

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios({
      method: 'GET',
      url: `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    }) 

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    })
  } catch (err) {
    showAlert('error', err)
  }
}