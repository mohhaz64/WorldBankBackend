const yup = require("yup")

const userSignUpSchema = yup.object({
    email: yup.string().email("Email is invalid").required("Email is required"),
    password: yup
        .string()
        .min(8, "Password must be at least 8 charaters")
        .required("Password is required"),
    confirmPassword: yup
        .string()
        .oneOf([yup.ref("password"), null], "Password must match")
        .required("Confirm password is required"),
})

module.exports = userSignUpSchema
