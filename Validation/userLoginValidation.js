const yup = require("yup")

const userLoginSchema = yup.object({
    email: yup.string().email("Email is invalid").required("Email is required"),
    password: yup
        .string()
        .min(8, "Password must be at least 8 charaters")
        .required("Password is required"),
})

module.exports = userLoginSchema
