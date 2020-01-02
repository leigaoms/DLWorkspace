import React, {
  FunctionComponent,
  KeyboardEvent,
  useCallback,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  MouseEvent
} from 'react';
import { useHistory } from 'react-router-dom';
import { Button, TextField } from '@material-ui/core';
import MaterialTable, { Column, Options } from 'material-table';
import useFetch from 'use-http-2';

import TeamsContext from '../../contexts/Teams';

import Loading from '../../components/Loading';
import Error from '../../components/Error';

import ClusterContext from './ClusterContext';
import useActions from './useActions';
import { renderDate, sortDate } from './tableUtils';

const renderUser = (job: any) => job['userName'].split('@', 1)[0];

const getSubmittedDate = (job: any) => new Date(job['jobTime']);
const getStartedDate = (job: any) => new Date(job['jobStatusDetail'] && job['jobStatusDetail'][0]['startedAt']);
const getFinishedDate = (job: any) => new Date(job['jobStatusDetail'] && job['jobStatusDetail'][0]['finishedAt']);

interface PriorityFieldProps {
  job: any;
}

const PriorityField: FunctionComponent<PriorityFieldProps> = ({ job }) => {
  const { cluster } = useContext(ClusterContext);
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>();
  const onBlur = useCallback(() => {
    setEditing(false);
  }, []);
  const onKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      const priority = input.current!.valueAsNumber;
      if (priority !== undefined) {
        fetch(`/api/clusters/${cluster.id}/jobs/${job['jobId']}/priority`, {
          method: 'PUT',
          body: JSON.stringify({ priority }),
          headers: { 'Content-Type': 'application/json' }
        });
      }
      setEditing(false);
    }
  }, [cluster.id, job['jobId']]);
  const onClick = useCallback((event: MouseEvent) => {
    setEditing(true);
  }, [])
  if (editing) {
    return (
      <TextField
        inputRef={input}
        type="number"
        defaultValue={job['priority']}
        onBlur={onBlur}
        onKeyPress={onKeyPress}
      />
    );
  }
  return <Button onClick={onClick}>{job['priority']}</Button>;
}

interface JobsTableProps {
  title: string;
  jobs: any[];
}

const JobsTable: FunctionComponent<JobsTableProps> = ({ title, jobs }) => {
  const history = useHistory();
  const { cluster } = useContext(ClusterContext);

  const onRowClick = useCallback((event: any, job: any) => {
    const e = encodeURIComponent;
    const to = `/job/${e(job['vcName'])}/${e(cluster.id)}/${e(job['jobId'])}`
    history.push(to);
  }, [cluster.id, history]);
  const [pageSize, setPageSize] = useState(5);
  const onChangeRowsPerPage = useCallback((pageSize: number) => {
    setPageSize(pageSize);
  }, [setPageSize]);

  const renderPrioirty = useCallback((job: any) => (
    <PriorityField job={job}/>
  ), [])

  const columns = useMemo<Array<Column<any>>>(() => [
    { title: 'Id', type: 'string', field: 'jobId' },
    { title: 'Name', type: 'string', field: 'jobName' },
    { title: 'Status', type: 'string', field: 'jobStatus' },
    { title: 'GPU', type: 'numeric', field: 'jobParams.resourcegpu' },
    { title: 'User', type: 'string',
      render: renderUser},
    { title: 'Preempable', type: 'boolean', field: 'jobParams.preemptionAllowed'},
    {
      title: 'Priority', type: 'numeric',
      render: renderPrioirty, disableClick: true },
    { title: 'Submitted', type: 'datetime',
      render: renderDate(getSubmittedDate), customSort: sortDate(getSubmittedDate) },
    { title: 'Started', type: 'datetime',
      render: renderDate(getStartedDate), customSort: sortDate(getStartedDate) },
    { title: 'Finished', type: 'datetime',
      render: renderDate(getFinishedDate), customSort: sortDate(getFinishedDate) },
  ], []);
  const options = useMemo<Options>(() => ({
    actionsColumnIndex: -1,
    pageSize
  }), [pageSize]);
  const { approve, kill, pause, resume, component } = useActions();
  const actions = [approve, kill, pause, resume];

  return (
    <>
      <MaterialTable
        title={title}
        columns={columns}
        data={jobs}
        options={options}
        actions={actions}
        onRowClick={onRowClick}
        onChangeRowsPerPage={onChangeRowsPerPage}
      />
      {component}
    </>
  );

}

const AllJobs: FunctionComponent = () => {
  const { cluster } = useContext(ClusterContext);
  const { selectedTeam } = useContext(TeamsContext);
  const { loading, error, data, get } = useFetch(
    `/api/v2/clusters/${cluster.id}/teams/${selectedTeam}/jobs?user=all&limit=100`,
    [cluster.id, selectedTeam]
  );
  const [jobs, setJobs] = useState<any[]>();
  useEffect(() => {
    setJobs(undefined);
  }, [cluster.id]);
  useEffect(() => {
    let timeout: number | undefined;
    if (data !== undefined) {
      setJobs(data);
      timeout = setTimeout(get, 10000);
    }
    return () => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }, [data, get]);

  const runningJobs = useMemo(() => {
    if (jobs === undefined) return undefined;
    const runningJobs = jobs.filter((job: any) => job['jobStatus'] === 'running');
    if (runningJobs.length === 0) return undefined;
    return runningJobs;
  }, [jobs]);
  const queuingJobs = useMemo(() => {
    if (jobs === undefined) return undefined;
    const queuingJobs = jobs.filter((job: any) => job['jobStatus'] === 'queued' || job['jobStatus'] === 'scheduling' );
    if (queuingJobs.length === 0) return undefined;
    return queuingJobs
  }, [jobs]);
  const unapprovedJobs = useMemo(() => {
    if (jobs === undefined) return undefined;
    const unapprovedJobs = jobs.filter((job: any)=>job['jobStatus'] === 'unapproved');
    if (unapprovedJobs.length === 0) return undefined;
    return unapprovedJobs
  }, [jobs]);
  const pausedJobs = useMemo(() => {
    if (jobs === undefined) return undefined;
    const pausedJobs = jobs.filter((job: any) => job['jobStatus'] === 'paused' || job['jobStatus'] === 'pausing' );
    if (pausedJobs.length === 0) return undefined;
    return pausedJobs
  }, [jobs]);


  if (jobs !== undefined) return (
    <>
      {runningJobs && <JobsTable title="Running Jobs" jobs={runningJobs}/>}
      {queuingJobs && <JobsTable title="Queuing Jobs" jobs={queuingJobs}/>}
      {unapprovedJobs && <JobsTable title="Unapproved Jobs" jobs={unapprovedJobs}/>}
      {pausedJobs && <JobsTable title="Pauses Jobs" jobs={pausedJobs}/>}
    </>
  );
  if (loading) return <Loading/>;
  if (error) return <Error message="Failed to fetch the data, try reloading the page."/>;

  return null;
};

export default AllJobs;
