/* eslint-disable */

import axios from 'axios'
import { showAlert } from './alert'

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? 'https://laerpeek.top:5000/api/v1/users/updateMyPassword'
        : 'https://laerpeek.top:5000/api/v1/users/updateMe'
    const res = await axios({
      method: 'PATCH',
      url,
      data
    })
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`)
      return Promise.resolve()
    }
  } catch (err) {
    showAlert('error', err.response.data.message)
    return Promise.reject()
  }
}
