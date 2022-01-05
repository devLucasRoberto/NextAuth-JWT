import { useContext, useEffect } from 'react'
import { Can } from '../components/Can'
import { AuthContext } from '../contexts/AuthContext'
import { useCan } from '../hooks/useCan'
import { setupAPIClient } from '../services/api'
import { api } from '../services/apiClient'
import { withSSRAuth } from '../utils/withSSRAuth'

export default function Dashboard() {
  const { user } = useContext(AuthContext)

  const userCanSeeMatrics = useCan({
    permissions: ['metrics.list']
  })

  useEffect(() => {
    api
      .get('/me')
      .then(response => console.log(response))
      .catch(error => console.log(error))
  }, [])

  return (
    <>
      <h1>Dashboard: {user?.email}</h1>

      {userCanSeeMatrics && <div>Métricas</div>}

      <Can permissions={['metrics.list']}>
        <div>Métricas Component</div>
      </Can>
    </>
  )
}

export const getServerSideProps = withSSRAuth(async ctx => {
  const apiClient = setupAPIClient(ctx)
  const reponse = await apiClient.get('/me')

  console.log(reponse.data)

  return {
    props: {}
  }
})
