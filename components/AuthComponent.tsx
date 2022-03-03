// import React, { useEffect, useState } from 'react';
// import { Navigate } from 'react-router-dom';

// interface AuthComponentProps {
//   element: JSX.Element;
// }

// export default function AuthComponent({ element }: AuthComponentProps) {
//   const [redirect, setRedirect] = useState<boolean | undefined>();

//   useEffect(() => {
//     fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'checkToken', {credentials: 'include'}).then(res => {
//       if (res.status === 200) {
//         setRedirect(false);
//       } else {
//         setRedirect(true);
//         throw res.text();
//       }
//     }).catch(err => {
//       console.error(err);
//       setRedirect(true);
//     });
//   }, []);

//   return (<>
//     {redirect === undefined ? null : redirect ? <Navigate to='/login'/> : element}
//   </>);
// }

export {}
