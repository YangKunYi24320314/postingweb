function toCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  }
}

function toTag(row) {
  return row.name
}

module.exports = { toCategory, toTag }
