import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as bookingApi from '@/api/booking'

export const useBookingStore = defineStore('booking', () => {
  // State
  const selectedDate = ref(null)
  const selectedSlots = ref([])
  const currentCoach = ref('dama')
  const selectedLocation = ref('')
  const repeatOption = ref('none')

  // Getters
  const hasSelectedSlots = computed(() => selectedSlots.value.length > 0)
  const totalDuration = computed(() => {
    return selectedSlots.value.reduce((total, slot) => {
      const start = slot.start_time.split(':')
      const end = slot.end_time.split(':')
      const hours = parseInt(end[0]) - parseInt(start[0])
      const minutes = parseInt(end[1]) - parseInt(start[1])
      return total + hours + minutes / 60
    }, 0)
  })

  // Actions
  function setSelectedDate(date) {
    selectedDate.value = date
  }

  function setCurrentCoach(coach) {
    currentCoach.value = coach
  }

  function toggleSlot(slot) {
    const index = selectedSlots.value.findIndex(s =>
      s.date === slot.date &&
      s.start_time === slot.start_time &&
      s.end_time === slot.end_time
    )

    if (index > -1) {
      selectedSlots.value.splice(index, 1)
    } else {
      selectedSlots.value.push(slot)
    }
  }

  function removeSlot(slot) {
    const index = selectedSlots.value.findIndex(s =>
      s.date === slot.date &&
      s.start_time === slot.start_time &&
      s.end_time === slot.end_time
    )
    if (index > -1) {
      selectedSlots.value.splice(index, 1)
    }
  }

  function clearSelectedSlots() {
    selectedSlots.value = []
    selectedDate.value = null
  }

  function setSelectedLocation(location) {
    selectedLocation.value = location
  }

  function setRepeatOption(option) {
    repeatOption.value = option
  }

  async function submitBooking() {
    const data = {
      slots: selectedSlots.value,
      location: selectedLocation.value,
      repeat: repeatOption.value
    }
    return await bookingApi.createBooking(data)
  }

  return {
    selectedDate,
    selectedSlots,
    currentCoach,
    selectedLocation,
    repeatOption,
    hasSelectedSlots,
    totalDuration,
    setSelectedDate,
    setCurrentCoach,
    toggleSlot,
    removeSlot,
    clearSelectedSlots,
    setSelectedLocation,
    setRepeatOption,
    submitBooking
  }
})
