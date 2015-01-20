# Writing UI tests with Applitools Eyes

Applitools Eyes is a service that lets us upload and compare screenshots of our site over time.

## Getting an account

Code.org employees as of this writing should receive login details for a shared account. If not, contact Brian about getting an account.

## Add your feature to the eyes file

Either add your test to `/dashboard/test/ui/features/eyes.feature`

OR

add your test to a new `.feature` file, annotating it with `@eyes`

## Run the test

For now, to run locally, you must have the Applitools secret key installed in your `locals.yml`. Ask Brian when needed.

### Try it locally

1. `./runner.rb -m -l --eyes` (running Chromedriver)
  1. Toggle ONLY running @eyes annotated tests with `--eyes`
  1. Usually the first test run will fail due to there being no baseline yet. In `error.log` you can see the exact error which usually includes a link to the session
1. Visit the [Applitools sessions dashboard](https://eyes.applitools.com/app/sessions/) to see your test run
  1. **Accept** the changes and **Save** (bottom right)

### Try it targeting BrowserStack

1. `bundle exec ./runner.rb --eyes -c Chrome33Win7`

## Watch for run on next deploy

In `aws/build.rake`, as part of the test.code.org CI script, the eyes tests will be run (as of writing, currently only against the Chrome 33 browser).

Results are reported to HipChat.
