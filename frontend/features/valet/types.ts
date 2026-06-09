export type ValetRequestInput = {
  name: string
  license_plate: string
  car_make?: string
  table_id?: string
  table_no?: string
  qr?: string
}

export type ValetRequestResult = {
  ok?: boolean
  success?: boolean
  message: string
  id?: number
  notification_id?: number
  created_at?: string
}

export type UseValetRequestState = {
  isSubmitting: boolean
  isSuccess: boolean
  errorMessage: string
}
