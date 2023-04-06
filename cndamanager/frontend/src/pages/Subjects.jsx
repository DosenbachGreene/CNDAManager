import '../App.css';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Classes, Checkbox, Elevation, FormGroup, Intent, NonIdealState, Label, Spinner } from "@blueprintjs/core";

function withHook(Component) {
    return function WrappedComponent(props) {
        const location = useLocation();
        const project_id = location.state.project_id;
        const navigate = useNavigate();
        return <Component {...props} project_id={project_id} navigate={navigate} />;
    }
}

class Subjects extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            project_id: "None",
            subject_ids: [],
            selected_subjects: new Set(),
            is_loading: true
        }
    }

    componentDidMount() {
        this.setState({ project_id: this.props.project_id }, () => {
            this.retrieveSubjects();
        });
    }

    componentWillUnmount() {
        this.setState({
            subject_ids: [],
            project_id: "None",
            selected_subjects: new Set(),
            is_loading: true
        });
    }

    retrieveSubjects() {
        fetch(`api/projects/${this.state.project_id}`)
            .then(response => response.json())
            .then(response => this.setState({ subject_ids: response }))
            .finally(() => this.setState({ is_loading: false }));
    }

    handleCheckbox(event) {
        if (event.target.checked) {
            this.state.selected_subjects.add(event.target.name)
        }
        else {
            if (this.state.selected_subjects.has(event.target.name)) {
                this.state.selected_subjects.delete(event.target.name)
            }
        }
    }

    handleCheckedSubjects = () => {
        const state = { subjects: this.state.selected_subjects, project_id: this.state.project_id };
        this.props.navigate('/download', { state });
    }

    getCheckboxes() {
        const checkboxRow = [];

        for (let i = 0; i < this.state.subject_ids.length; i++) {
            checkboxRow.push(<Checkbox onChange={e => this.handleCheckbox(e)} key={i} label={this.state.subject_ids[i]} name={this.state.subject_ids[i]} />);
        }

        return checkboxRow;
    }

    render() {

        const checkboxRow = this.getCheckboxes();

        if (this.state.is_loading) {
            return (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100vh",
                    }}
                >
                    <NonIdealState icon=<Spinner /> title="Loading Subjects..." />
                </div>

            )
        }


        return (
            // each button will load the project's subjects
            <Card elevation={Elevation.ONE}>
                <Label className={Classes.UI_TEXT}>Choose subjects to download</Label>
                <FormGroup className={Classes.UI_TEXT}>
                    {checkboxRow}
                </FormGroup>
                <Button intent={Intent.PRIMARY} className={Classes.UI_TEXT} onClick={() => this.handleCheckedSubjects()}> Proceed to Download </Button>
            </Card>
        );
    }
}


export default withHook(Subjects);