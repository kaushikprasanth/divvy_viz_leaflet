import React, { useEffect ,useState} from 'react';

function Clock(props) {
    useEffect(() => {
    }, []);
    return (
       <div>
           <h3>{new Date(props.time).toString()}</h3>
       </div>
    )
}

export default Clock;