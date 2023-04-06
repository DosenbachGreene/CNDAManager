import '../App.css';
import React from 'react';
import { useLocation, useNavigate} from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { Card, Elevation, Intent, ProgressBar } from '@blueprintjs/core';


function withHook(Component){
    return function WrappedComponent(props) {
        const location = useLocation();
        const subjects = location.state.subjects;
        const project_id = location.state.project_id;
        const navigate = useNavigate();
        return <Component {...props} subjects={subjects} project_id={project_id} navigate={navigate} />;
    }
}

class Downloads extends React.Component{

    constructor(props){
        super(props);
        this.state = {
            subjects: [],
            progress_bars: [],
            project_id: "None",
            download_job_id : NaN,
            download_status: NaN,
        }
    }

    componentDidMount() {
        this.setState({
            subjects: Array.from(this.props.subjects),
            project_id: this.props.project_id,
            download_job_id: uuidv4()
        }, () => {
            this.queueDownloads();
        });

        this.interval = setInterval(() => {
            this.getDownloadStatus();
          }, 10000);
    }

    componentWillUnmount() {
        this.setState({
            subjects: [],
            project_id: "None",
            download_job_id : NaN,
            download_status: NaN,
          });
    }

    getDownloadStatus() {
        console.log(this.state.download_job_id)
        fetch(`api/download/status/${this.state.download_job_id}`)
        .then(response => response.json())
        .then(response => this.setState({download_status: response}, () => {
            console.log(this.state.download_status);
        }))
    }

    queueDownloads() {
        fetch('api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                download_job_id: this.state.download_job_id,
                subject_ids: this.state.subjects,
                project_id: this.state.project_id
            })
        })
        .then(response => response.json())
        .then(response => console.log(response))
        .finally(() => {
            this.createProgressBars();
        });
    }

    createProgressBars() {
        const waiting_list = this.state.subjects.reduce((obj, item) => {
            obj[item] = "sending request...";
            return obj;
        }, {});

        this.setState({download_status: waiting_list} , () => {
            console.log(this.state.download_status);
        });
    }

    drawProgressBar(value) {
        if (value === "in_progress") {
             return <ProgressBar intent={Intent.PRIMARY} animate={true} stripes={true} />
        }
        else if (value === "complete") {
            return <ProgressBar intent={Intent.SUCCESS} animate={false} stripes={false} />
        }
        else if (value === "failed") {
            return <ProgressBar intent={Intent.DANGER} animate={false} stripes={false} />
        }
        else {
            return <ProgressBar intent={Intent.NONE} animate={true} stripes={true}/>
        }
    }

    renderListItems() {

        const keyValuePairs = Object.entries(this.state.download_status);
    
        const renderedItems = keyValuePairs.map(([key, value]) => (
          <Card interactive={true} key={key} elevation={Elevation.TWO}>
            <h3>Subject: {key}</h3>
            <p>Progress: {value}</p>
            {this.drawProgressBar(value)}
          </Card>
        ));

        return renderedItems;
    }

    render() {
    
        return(
            <div>
                {this.renderListItems()}
            </div>
        )
    }
}

export default withHook(Downloads);
