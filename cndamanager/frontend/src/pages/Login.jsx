import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Classes, Colors, FormGroup, InputGroup, Intent } from "@blueprintjs/core";

// Create login component
export default function Login(props) {
    const navigate = useNavigate();

    const onSubmit = (event) => {
        event.preventDefault();
        var formData = new FormData(event.target);
        var searchParams = new URLSearchParams(formData).toString();
        // post login info
        fetch('api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: searchParams,
        }).then(response => response.json()).then(response => {
            if (response["login_status"] === 0) {
                // redirect to projects page
                navigate("/projects", {})
            } else {
                // display error message
                alert("Invalid username or password");
            }
        });
    }

    return (
        <div className={Classes.DARK} style={{backgroundColor: Colors.DARK_GRAY3 }}>
            <div className="container" style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "75vh",
            }}>
                <Card elevation={2} className={Classes.DARK} style={{ padding: "20px" }}>
                    <h1 className={Classes.HEADING}>Login</h1>
                    <form onSubmit={onSubmit}>
                        <FormGroup label="Username" labelFor="username">
                            <InputGroup id="username" name="username" type="text" />
                        </FormGroup>
                        <FormGroup label="Password" labelFor="password">
                            <InputGroup id="password" name="password" type="password" />
                        </FormGroup>
                        <Button type="submit" intent={Intent.PRIMARY}>Login</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
