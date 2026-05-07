import Layout from '../../components/shared/Layout.jsx';
import CalcAdmin from '../../components/calcEngine/CalcAdmin.jsx';

export default function CalcEnginePage() {
    return (
        <Layout isAdmin>
            <CalcAdmin />
        </Layout>
    );
}
