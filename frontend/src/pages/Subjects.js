import '../App.css';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Checkbox, FormGroup, Label, Spinner} from "@blueprintjs/core";

function withHook(Component){
    return function WrappedComponent(props) {
        const location = useLocation();
        const project_id = location.state.project_id;
        const navigate = useNavigate();
        return <Component {...props} project_id={project_id} navigate={navigate} />;
    }
}

class Subjects extends React.Component {

    constructor(props){
        super(props);
        
        this.state = {
            project_id: "None",
            subject_ids : [],
            selected_subjects : new Set(),
            is_loading: true
        }
    }

    componentDidMount() {
        const project_id = this.props.project_id;
        this.setState({project_id: this.props.project_id}, () => {
            this.retrieveSubjects();
        });
    }

    componentWillUnmount() {
        this.setState({
            subject_ids: [],
            project_id: "None",
            selected_subjects : new Set(),
            is_loading: true
          });
    }

    retrieveSubjects() {
        fetch(`/api/projects/${this.state.project_id}`)
        .then(response => response.json())
        .then(response => this.setState({subject_ids: response}))
        .finally(() => this.setState({is_loading: false}));
    }

    handleCheckbox(event) {
        if (event.target.checked){
            this.state.selected_subjects.add(event.target.name)
        }
        else {
            if (this.state.selected_subjects.has(event.target.name)) {
                this.state.selected_subjects.delete(event.target.name)
            }
        }
    }

    handleCheckedSubjects = () => {
        const state = {subjects: this.state.selected_subjects, project_id: this.state.project_id};
        this.props.navigate('/download', {state});
    }

    getCheckboxes(){
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
                    <Spinner />
                </div>
                
            )
        }


        return(
            // each button will load the project's subjects
            <FormGroup className="bp3-ui-text">
                <Label className="bp3-ui-text">Choose subjects to download</Label>
                {checkboxRow}
                <Button className="bp3-ui-text" onClick={() => this.handleCheckedSubjects()}> Proceed to Download </Button>
            </FormGroup>
        );
    }
}


export default withHook(Subjects);