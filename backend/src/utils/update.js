const ApiError = require("./ApiError");

function setsAndValues(req, fields) {
    const sets = []
    const values = [req.params.id, req.user.id]

    for (const f of fields) {
        if (req.body[f] !== undefined) {
            values.push(req.body[f])
            sets.push(`${f} = $${values.length}`)
        }
    }
    if (!sets.length) throw ApiError.badRequest("No fields to update")

    return [sets, values]
}

module.exports = {setsAndValues};