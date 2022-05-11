const User = require("../../models/user");
const router = require("../users");




router.route("/checkExistenceOfUsers/:package").get((req, res) => {
    const package = JSON.parse(req.params.package);
    const { name, users } = package;
    console.log('package: ', package);
    if (name === 'checkingExistenceOfUsers') {
        const userIds = users.map(({ _id }) => _id);
        User.find({ _id: { $in: userIds } }, { _id: 1 }).then(usersResults => {
            console.log('usersResults: ', usersResults);
            const userIdsResults = usersResults.map(({ _id }) => JSON.parse(JSON.stringify(_id)));
            let _users = users.filter(({ _id }) => userIdsResults.includes(_id));
            res.json(_users)
        })

    }
})

module.exports = router;
