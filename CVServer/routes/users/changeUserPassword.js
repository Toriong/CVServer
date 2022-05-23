const User = require("../../models/user");
const router = require("../users");






router.route("/changeUserPassword").post((request, response) => {
    console.log('request.body: ', request.body)
    // console.log('request: ', request)
    const { userId, data } = request.body;
    const { oldPassword, newPassword } = data;
    User.findOne({ _id: userId }, { password: 1 }).then(user => {
        console.log('user: ', user)
        if (user) {
            console.log('oldPassword: ', oldPassword)
            const isOldPasswordCorrect = user.password === oldPassword;
            if (isOldPasswordCorrect) {
                User.updateOne(
                    {
                        _id: userId
                    },
                    {
                        $set: { password: newPassword }
                    },
                    (error, numsAffected) => {
                        if (error) {
                            console.error('An error has occurred in updating old password of user: ', error);
                            response.status(500).send('Something went wrong, please try again later or refresh the page.')
                        }
                        console.log('Password updated, numbers affected: ', numsAffected);
                        response.json('Password was successfully updated.')
                    }
                );
            } else {
                console.error('An error has occurred, incorrect password.')
                response.status(401).send('Incorrect old password. Please try again.')
            }
        } else {
            console.error('An error has occurred.')
            response.status(404).send('Something went wrong. Please try again later.')
        }
    }).catch(error => {
        if (error) {
            response.status(404).send('Something went wrong. Please try again later.')
        }
    })
})







module.exports = router;