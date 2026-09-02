function shouldSkipUpload(state, today) {
  return Boolean(state && state.date === today && state.uploaded === true)
}

module.exports = { shouldSkipUpload }
