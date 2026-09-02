# Auth Logout Design

## Goal

Give authenticated users an explicit way to end their local session from the main layout.

## Behavior

- Anonymous users see `登录` and are taken to `/login`.
- Authenticated users see `个人中心` and a nearby `退出登录` action.
- Clicking `退出登录` removes the local JWT, shows a success message, and navigates to `/login`.
- No server logout endpoint is needed because the current JWT flow is stateless; removing the client token prevents further authenticated requests.

## Verification

- Add a unit test for the logout action orchestration.
- Run the full server test suite, client lint, and client production build.
- Manually refresh the local app, log in, click `退出登录`, and verify the login page appears.
