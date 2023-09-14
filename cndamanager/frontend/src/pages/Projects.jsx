import '../App.css';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Intent, Radio, RadioGroup, Card, Elevation, NonIdealState, Spinner } from "@blueprintjs/core";

function withHook(Component){
    return function WrappedComponent(props) {
        const navigate = useNavigate();
        return <Component {...props} navigate={navigate} />;
    }
}

class Projects extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            projects: "None",
            selected_project: "None"
        }
    }

    componentDidMount() {
        // this should be used to get all projects from cnda as a list
        fetch('api/projects')
        .then(response => response.json())
        .then(response => this.setState({projects: response}));
    }

    componentWillUnmount() {
        this.setState({
            projects: "None",
            selected_project: "None"
          });
    }

    handleProjectChange = (event) => {
        this.setState({selected_project: event.target.value});
    }

    getButtons() {
        const buttonRow = [];

        for (let i = 0; i < this.state.projects.length; i++) {
            buttonRow.push(<Radio key={i} label={this.state.projects[i]} value={this.state.projects[i]} />);
        }

        return buttonRow;

    }

    handleContinue = () => {
        const state = {project_id: this.state.selected_project};
        this.props.navigate('/subjects', {state});
    }

    render() {

        const isProjectSelected = this.state.selected_project !== "None";
        const buttonRow = this.getButtons();

        if (this.state.projects === "None") {
            let icon = <Spinner size={Spinner.SIZE_LARGE} intent={Intent.PRIMARY} />
            return (
                <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
                    <NonIdealState icon={icon} title="Loading Projects..." />
                </div>
            )
        }

        return(
            // each button will load the project's subjects
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <Card elevation={Elevation.ONE}>
                    <RadioGroup label="Choose which project to download from:" onChange={this.handleProjectChange} selectedValue={this.state.selected_project}>
                        {buttonRow}
                    </RadioGroup>
                    <Button intent={Intent.PRIMARY} onClick={() => this.handleContinue()} text="Continue" disabled={!isProjectSelected}/>
                </Card>
            </div>
        );
    }
}


export default withHook(Projects);