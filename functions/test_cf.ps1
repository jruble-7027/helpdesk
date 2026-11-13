$body = @{
  to = 'jruble@wcatrojans.org'
  subject = 'Test from Cloud Function'
  text = 'Hello Jonathan, this is a test from Cloud Function.'
  html = '<p>Hello Jonathan, this is a test from Cloud Function.</p>'
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri 'https://us-central1-wca-tickets-58f6c.cloudfunctions.net/sendTicketNotification' -Method Post -ContentType 'application/json' -Body $body
$resp | ConvertTo-Json
