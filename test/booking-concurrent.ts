import axios from 'axios';

const url = 'http://localhost:3000/api/v1/bookings';

const token =
  'eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQnBnMEhPVmdudnp0RnNHZTBzZElOYnA1ekQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL2ludGVudC1ncnViLTQwLmFjY291bnRzLmRldiIsImV4cCI6MTgwNzA2MTk4OSwiaWF0IjoxNzc1NTI1OTg5LCJpc3MiOiJodHRwczovL2ludGVudC1ncnViLTQwLmNsZXJrLmFjY291bnRzLmRldiIsImp0aSI6IjY0ZTgyNDk2NGUzNjQwY2JjZGRlIiwibmJmIjoxNzc1NTI1OTg0LCJzdWIiOiJ1c2VyXzNDMGNWa1RaZjg3SjRVbmp3cWlDSjJ1SVhFVCJ9.Rwjm_W2pHBV-PvKvPkcQf-vRcpJz589KSYzT2VYM8zMzzFaUbhTD5Odb5DABvARa_SFNLvipoP6N38WLNJFWfL7rJYIl2-thrWEOeIvw2nu9upXOGro3xocx2BM4IW-3BbTePZxVoKIbX9Qqti_zxezwAhyEB7RulnLWCNYukFk_AgTytJG3p_jFlNnE17HlO_j0QSIaLL3ejpV26QJSazQeB7bWtbE_S4KEuGYRrIfftN6epquXu8lc-HhzCeYXr4krBtM0KNcEgVGcN3kjFJgaFyXphSTXPl5e-pXhYegB4bggXm_MlqW7f8SbA_guSKTK4n1CrRGaKr8Uz0tiRQ';

const slotId = '33b8d42e-1434-4723-915d-abe27c7a198a';

async function test() {
  const requests = [
    axios.post(
      url,
      {
        slotId,
        idempotencyKey: 'key-3',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),
    axios.post(
      url,
      {
        slotId,
        idempotencyKey: 'key-4',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),
  ];

  const results = await Promise.allSettled(requests);

  results.forEach((res, index) => {
    if (res.status === 'fulfilled') {
      console.log(`Request ${index + 1} SUCCESS:`);
      console.log(JSON.stringify(res.value.data, null, 2));
    } else {
      console.log(`Request ${index + 1} ERROR:`);
      console.log(JSON.stringify(res.reason, null, 2));
    }
  });
}

void test();
